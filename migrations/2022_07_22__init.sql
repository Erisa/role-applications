CREATE TABLE options (
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
    options_id INT,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('PARAGRAPH', 'SHORT')) NOT NULL,
    FOREIGN KEY (options_id) REFERENCES options (id)
);

CREATE TABLE applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    options_id TEXT NOT NULL,
    FOREIGN KEY (options_id) REFERENCES options (id)
);

CREATE TABLE answers (
    question_id INT,
    application_id INT,
    text TEXT,
    FOREIGN KEY (question_id) REFERENCES questions (id),
    FOREIGN KEY (application_id) REFERENCES applications (id)
);
