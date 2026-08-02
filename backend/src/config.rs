use std::{env, net::SocketAddr, path::PathBuf, time::Duration};

use axum::http::HeaderValue;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing required environment variable: {0}")]
    Missing(&'static str),
    #[error("invalid environment variable {name}: {source}")]
    Invalid {
        name: &'static str,
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub bind_addr: SocketAddr,
    pub frontend_origin: HeaderValue,
    pub compiler_enabled: bool,
    pub compiler_path: PathBuf,
    pub compile_timeout: Duration,
    pub session_ttl: Duration,
    pub cookie_secure: bool,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let database_url =
            env::var("DATABASE_URL").map_err(|_| ConfigError::Missing("DATABASE_URL"))?;
        let bind_addr = parse(
            "BIND_ADDR",
            env::var("BIND_ADDR")
                .ok()
                .unwrap_or_else(|| "127.0.0.1:18732".into()),
        )?;
        let frontend_origin = parse(
            "FRONTEND_ORIGIN",
            env::var("FRONTEND_ORIGIN")
                .ok()
                .unwrap_or_else(|| "http://localhost:5173".into()),
        )?;
        let compiler_enabled = parse(
            "LATEX_COMPILER_ENABLED",
            env::var("LATEX_COMPILER_ENABLED")
                .ok()
                .unwrap_or_else(|| "false".into()),
        )?;
        let compiler_path = env::var("LATEX_COMPILER_PATH")
            .unwrap_or_else(|_| "xelatex".into())
            .into();
        let compile_timeout = Duration::from_secs(parse(
            "COMPILE_TIMEOUT_SECONDS",
            env::var("COMPILE_TIMEOUT_SECONDS")
                .ok()
                .unwrap_or_else(|| "30".into()),
        )?);
        let session_ttl = Duration::from_secs(parse(
            "SESSION_TTL_SECONDS",
            env::var("SESSION_TTL_SECONDS")
                .ok()
                .unwrap_or_else(|| "2592000".into()),
        )?);
        let cookie_secure = parse(
            "COOKIE_SECURE",
            env::var("COOKIE_SECURE")
                .ok()
                .unwrap_or_else(|| "false".into()),
        )?;

        Ok(Self {
            database_url,
            bind_addr,
            frontend_origin,
            compiler_enabled,
            compiler_path,
            compile_timeout,
            session_ttl,
            cookie_secure,
        })
    }

    pub fn origin_is_allowed(&self, origin: &HeaderValue) -> bool {
        origin == &self.frontend_origin
    }
}

fn parse<T>(name: &'static str, value: String) -> Result<T, ConfigError>
where
    T: std::str::FromStr,
    T::Err: std::error::Error + Send + Sync + 'static,
{
    value.parse().map_err(|source| ConfigError::Invalid {
        name,
        source: Box::new(source),
    })
}
