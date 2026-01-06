import os

ROOT_DIR = "."  # Diretório raiz
OUTPUT_FILE = "repo_dump.md"

# Arquivos ou pastas que devem ser ignorados
IGNORE_PATTERNS = [
    ".git",
    "__pycache__",
    ".dockerignore",
    ".gitignore",
    "node_modules",
    ".next",
    "package-lock.json",
    "out",
    "brazil-locations.ts",
    OUTPUT_FILE,
]

# Extensões permitidas (apenas essas serão analisadas)
ALLOWED_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".json", ".css"]


def should_ignore(path):
    return any(pattern in path for pattern in IGNORE_PATTERNS)


def has_allowed_extension(path):
    ext = os.path.splitext(path)[1]
    return ext in ALLOWED_EXTENSIONS


def collect_files(root):
    file_paths = []
    for dirpath, _, filenames in os.walk(root):
        if should_ignore(dirpath):
            continue

        for f in filenames:
            full_path = os.path.join(dirpath, f)

            if should_ignore(full_path):
                continue

            if not has_allowed_extension(full_path):
                continue

            file_paths.append(full_path)

    return sorted(file_paths, key=lambda x: x.lower())


def read_file(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read().strip()
            return content
    except Exception:
        return ""


def generate_markdown(file_data):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as md:
        md.write("# 📁 Dump Completo do Repositório\n\n")

        # Lista apenas arquivos COM conteúdo
        for path, content in file_data:
            if not content:
                continue

            md.write(f"## `{path}`:\n\n")
            md.write("```\n")
            md.write(content)
            md.write("\n```\n")
            md.write("\n---\n\n")

        # Resumo final
        md.write("\n# 📌 Resumo\n\n")

        md.write("## Arquivos com conteúdo:\n")
        for path, content in file_data:
            if content:
                md.write(f"- {path}\n")

        md.write("\n## Arquivos vazios:\n")
        for path, content in file_data:
            if not content:
                md.write(f"- {path}\n")

    print(f"Arquivo Markdown gerado: {OUTPUT_FILE}")


def main():
    files = collect_files(ROOT_DIR)

    file_data = []
    for f in files:
        content = read_file(f)
        file_data.append((f, content))

    generate_markdown(file_data)


if __name__ == "__main__":
    main()