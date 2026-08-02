CREATE TABLE cv_templates (
    id text PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 64),
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
    description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
    display_order integer NOT NULL CHECK (display_order >= 0),
    source_asset text NOT NULL CHECK (char_length(source_asset) BETWEEN 1 AND 160),
    preview_asset text NOT NULL CHECK (char_length(preview_asset) BETWEEN 1 AND 160),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO cv_templates (id, name, description, display_order, source_asset, preview_asset)
VALUES (
    'editorial-v1',
    'Editorial dossier',
    'A compact, proof-oriented CV with strong section hierarchy.',
    10,
    'editorial-v1.tex',
    'editorial-v1.pdf'
), (
    'compact-v1',
    'Compact signal',
    'Denser typography and spacing for CVs with more to say.',
    20,
    'compact-v1.tex',
    'compact-v1.pdf'
), (
    'modern-v1',
    'Modern hierarchy',
    'A contemporary layout with a stronger blue accent and sans-serif header.',
    30,
    'modern-v1.tex',
    'modern-v1.pdf'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    source_asset = EXCLUDED.source_asset,
    preview_asset = EXCLUDED.preview_asset,
    updated_at = now();

ALTER TABLE cv_drafts
    ADD COLUMN generated_template_id text;

UPDATE cv_drafts
SET template_id = 'editorial-v1'
WHERE template_id IN ('default', 'legacy-default')
   OR NOT EXISTS (SELECT 1 FROM cv_templates WHERE id = template_id);

UPDATE cv_drafts
SET generated_template_id = CASE
    WHEN generated_source IS NULL THEN NULL
    ELSE template_id
END;

ALTER TABLE cv_drafts
    ALTER COLUMN template_id SET DEFAULT 'editorial-v1',
    ADD CONSTRAINT cv_drafts_template_fk
        FOREIGN KEY (template_id) REFERENCES cv_templates(id),
    ADD CONSTRAINT cv_drafts_generated_template_fk
        FOREIGN KEY (generated_template_id) REFERENCES cv_templates(id),
    ADD CONSTRAINT cv_drafts_generated_template_length
        CHECK (generated_template_id IS NULL OR char_length(generated_template_id) BETWEEN 1 AND 64);
