use std::{path::Path, process::Stdio, sync::Arc, time::Duration};

use async_trait::async_trait;
use regex::Regex;
use tempfile::TempDir;
use tokio::{process::Command, time::timeout};

use super::model::Diagnostic;
use crate::config::Config;

pub struct CompileOutput {
    pub pdf: Option<Vec<u8>>,
    pub diagnostics: Vec<Diagnostic>,
    pub error_code: Option<String>,
    pub cancelled: bool,
}

#[async_trait]
pub trait Compiler: Send + Sync {
    async fn compile(&self, source: &str, job_id: uuid::Uuid) -> CompileOutput;
}

pub struct DisabledCompiler;

#[async_trait]
impl Compiler for DisabledCompiler {
    async fn compile(&self, _source: &str, _job_id: uuid::Uuid) -> CompileOutput {
        CompileOutput {
            pdf: None,
            diagnostics: vec![Diagnostic {
                severity: "error".into(),
                code: "COMPILER_DISABLED".into(),
                message: "The XeLaTeX compiler is disabled in this environment.".into(),
                file: None,
                line: None,
                column: None,
            }],
            error_code: Some("COMPILER_DISABLED".into()),
            cancelled: false,
        }
    }
}

pub struct XeLatexCompiler {
    path: Arc<std::path::PathBuf>,
    timeout: Duration,
}

impl XeLatexCompiler {
    pub fn new(config: &Config) -> Self {
        Self {
            path: Arc::new(config.compiler_path.clone()),
            timeout: config.compile_timeout,
        }
    }
}

#[async_trait]
impl Compiler for XeLatexCompiler {
    async fn compile(&self, source: &str, _job_id: uuid::Uuid) -> CompileOutput {
        match timeout(self.timeout, self.run(source)).await {
            Ok(output) => output,
            Err(_) => CompileOutput {
                pdf: None,
                diagnostics: vec![Diagnostic {
                    severity: "error".into(),
                    code: "COMPILE_TIMEOUT".into(),
                    message: "Compilation exceeded the time limit.".into(),
                    file: None,
                    line: None,
                    column: None,
                }],
                error_code: Some("COMPILE_TIMEOUT".into()),
                cancelled: false,
            },
        }
    }
}

impl XeLatexCompiler {
    async fn run(&self, source: &str) -> CompileOutput {
        let directory = match TempDir::new() {
            Ok(directory) => directory,
            Err(error) => return internal_error(error.to_string()),
        };
        let input = directory.path().join("main.tex");
        if let Err(error) = tokio::fs::write(&input, source).await {
            return internal_error(error.to_string());
        }
        let child = match Command::new(Path::new(self.path.as_ref()))
            .args([
                "-interaction=nonstopmode",
                "-halt-on-error",
                "-file-line-error",
                "-no-shell-escape",
                "-output-directory",
            ])
            .arg(directory.path())
            .arg(&input)
            .current_dir(directory.path())
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
        {
            Ok(child) => child,
            Err(error) => return internal_error(format!("failed to start XeLaTeX: {error}")),
        };
        match child.wait_with_output().await {
            Ok(output) if output.status.success() => {
                match tokio::fs::read(directory.path().join("main.pdf")).await {
                    Ok(pdf) => CompileOutput {
                        pdf: Some(pdf),
                        diagnostics: parse_diagnostics(&output.stdout, &output.stderr),
                        error_code: None,
                        cancelled: false,
                    },
                    Err(error) => {
                        internal_error(format!("compiler did not produce a PDF: {error}"))
                    }
                }
            }
            Ok(output) => CompileOutput {
                pdf: None,
                diagnostics: parse_diagnostics(&output.stdout, &output.stderr),
                error_code: Some("COMPILE_FAILED".into()),
                cancelled: false,
            },
            Err(error) => internal_error(error.to_string()),
        }
    }
}

fn internal_error(message: String) -> CompileOutput {
    CompileOutput {
        pdf: None,
        diagnostics: vec![Diagnostic {
            severity: "error".into(),
            code: "COMPILER_INTERNAL".into(),
            message,
            file: None,
            line: None,
            column: None,
        }],
        error_code: Some("COMPILER_INTERNAL".into()),
        cancelled: false,
    }
}

fn parse_diagnostics(stdout: &[u8], stderr: &[u8]) -> Vec<Diagnostic> {
    let text = format!(
        "{}\n{}",
        String::from_utf8_lossy(stdout),
        String::from_utf8_lossy(stderr)
    );
    let pattern =
        Regex::new(r"(?m)^([^:\r\n]+):(\d+):[ \t]*(.*)$").expect("valid diagnostic regex");
    let mut diagnostics = pattern
        .captures_iter(&text)
        .map(|capture| Diagnostic {
            severity: "error".into(),
            code: "TEX_ERROR".into(),
            message: capture[3].trim().to_owned(),
            file: Some(capture[1].to_owned()),
            line: capture[2].parse().ok(),
            column: None,
        })
        .collect::<Vec<_>>();
    if diagnostics.is_empty() && text.contains("Warning") {
        diagnostics.push(Diagnostic {
            severity: "warning".into(),
            code: "TEX_WARNING".into(),
            message: text
                .lines()
                .find(|line| line.contains("Warning"))
                .unwrap_or("XeLaTeX warning")
                .trim()
                .to_owned(),
            file: None,
            line: None,
            column: None,
        });
    }
    diagnostics
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn disabled_compiler_returns_structured_failure() {
        let output = DisabledCompiler
            .compile("\\documentclass{article}", uuid::Uuid::now_v7())
            .await;
        assert_eq!(output.error_code.as_deref(), Some("COMPILER_DISABLED"));
        assert_eq!(output.diagnostics[0].severity, "error");
    }

    #[test]
    fn parses_tex_file_line_diagnostics() {
        let diagnostics = parse_diagnostics(b"main.tex:17: Undefined control sequence", b"");
        assert_eq!(diagnostics[0].code, "TEX_ERROR");
        assert_eq!(diagnostics[0].line, Some(17));
        assert_eq!(diagnostics[0].file.as_deref(), Some("main.tex"));
    }

    #[test]
    fn parses_warnings_without_locations() {
        let diagnostics = parse_diagnostics(b"Package hyperref Warning: Token not allowed", b"");
        assert_eq!(diagnostics[0].severity, "warning");
        assert_eq!(diagnostics[0].line, None);
    }

    #[test]
    fn keeps_tex_error_location_and_message_separate() {
        let diagnostics = parse_diagnostics(
            b"(/usr/share/texlive/texmf-dist/tex/latex/base/size10.clo)\nmain.tex:190: Package fontspec Error: The font `Roboto' cannot be found.\n",
            b"",
        );
        assert_eq!(diagnostics[0].file.as_deref(), Some("main.tex"));
        assert_eq!(diagnostics[0].line, Some(190));
        assert_eq!(
            diagnostics[0].message,
            "Package fontspec Error: The font `Roboto' cannot be found."
        );
    }
}
