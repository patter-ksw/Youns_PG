-- 1. categories 테이블 생성
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. services 테이블 생성
CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    badge TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 초기 시드 데이터 삽입
-- (이전에 등록되지 않은 경우에만 삽입하도록 구성)
INSERT INTO categories (name, icon)
SELECT '공부방', '📚' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '공부방');

INSERT INTO categories (name, icon)
SELECT '놀이방', '🎮' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '놀이방');

INSERT INTO categories (name, icon)
SELECT '옷방', '👕' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '옷방');

-- 각 카테고리의 ID 조회 후 기본 서비스 등록
DO $$
DECLARE
    study_id BIGINT;
    play_id BIGINT;
BEGIN
    SELECT id INTO study_id FROM categories WHERE name = '공부방' LIMIT 1;
    SELECT id INTO play_id FROM categories WHERE name = '놀이방' LIMIT 1;

    IF study_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM services WHERE title = '번역기(단어장 만들기)' AND category_id = study_id) THEN
        INSERT INTO services (category_id, title, description, url, badge, icon)
        VALUES (study_id, '번역기(단어장 만들기)', '다국어 문서(사진)을 올려 전체 내용을 번역하고 사용한 단어를 선택하여 단어장을 만들어요', '#', 'Knowledge', '📖');
    END IF;

    IF play_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM services WHERE title = '테트리스 게임' AND category_id = play_id) THEN
        INSERT INTO services (category_id, title, description, url, badge, icon)
        VALUES (play_id, '테트리스 게임', '다양한 블록들을 쌓아서 한 줄을 지우며 높은 점수를 획득하는 고전 게임입니다', '#', 'Game', '🧱');
    END IF;
END $$;
