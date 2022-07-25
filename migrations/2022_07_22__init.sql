CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    role_id TEXT NOT NULL,
    mod_channel TEXT NOT NULL,
    button_text TEXT NOT NULL,
    welcome_channel TEXT DEFAULT NULL,
    welcome_text TEXT DEFAULT NULL
);

CREATE TABLE questions (
    id TEXT PRIMARY KEY,
    prompt_id TEXT,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('PARAGRAPH', 'SHORT')) NOT NULL,
    FOREIGN KEY (prompt_id) REFERENCES prompts (id)
);

CREATE TABLE applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    prompt_id TEXT NOT NULL,
    FOREIGN KEY (prompt_id) REFERENCES prompts (id)
);

CREATE TABLE answers (
    question_id TEXT,
    application_id TEXT,
    text TEXT,
    FOREIGN KEY (question_id) REFERENCES questions (id),
    FOREIGN KEY (application_id) REFERENCES applications (id)
);
