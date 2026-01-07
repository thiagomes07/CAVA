import os

ROOT_DIR = "."  # Diretório raiz do projeto
OUTPUT_FILE = "go_repo_dump.md"

# Pastas e arquivos ignorados
IGNORE_PATTERNS = [
    ".git",
    ".idea",
    ".vscode",
    "__pycache__",
    "node_modules",
    "vendor",
    OUTPUT_FILE,
]

# Extensões permitidas para projetos Go
ALLOWED_EXTENSIONS = [
    ".go",
    ".mod",
    ".sum",
    ".env",
    ".yml",
    ".yaml",
    ".sql",
    "Dockerfile",
    ".env.example",
]

def should_ignore(path: str) -> bool:
    return any(pattern in path for pattern in IGNORE_PATTERNS)

def has_allowed_extension(filename: str) -> bool:
    if filename == "Dockerfile":
        return True
    ext = os.path.splitext(filename)[1]
    return ext in ALLOWED_EXTENSIONS

def collect_files(root: str):
    file_paths = []

    for dirpath, _, filenames in os.walk(root):
        if should_ignore(dirpath):
            continue

        for filename in filenames:
            full_path = os.path.join(dirpath, filename)

            if should_ignore(full_path):
                continue

            if not has_allowed_extension(filename):
                continue

            file_paths.append(full_path)

    return sorted(file_paths, key=lambda x: x.lower())

def read_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read().strip()
    except Exception:
        return ""

def generate_markdown(file_data):
    # Sempre sobrescreve o arquivo
    with open(OUTPUT_FILE, "w", encoding="utf-8") as md:
        md.write("# 📁 Dump Completo do Projeto Go\n\n")

        md.write("## 📄 Arquivos analisados\n\n")

        for path, content in file_data:
            if not content:
                continue

            md.write(f"### `{path}`\n\n")
            md.write("```go\n")
            md.write(content)
            md.write("\n```\n\n")
            md.write("---\n\n")

        # Resumo final
        md.write("\n# 📌 Resumo Final\n\n")

        md.write("## ✅ Arquivos com conteúdo\n")
        for path, content in file_data:
            if content:
                md.write(f"- {path}\n")

        md.write("\n## ⚠️ Arquivos sem conteúdo\n")
        for path, content in file_data:
            if not content:
                md.write(f"- {path}\n")

    print(f"✅ Markdown gerado com sucesso: {OUTPUT_FILE}")

def main():
    files = collect_files(ROOT_DIR)

    file_data = []
    for f in files:
        content = read_file(f)
        file_data.append((f, content))

    generate_markdown(file_data)

if __name__ == "__main__":
    main()