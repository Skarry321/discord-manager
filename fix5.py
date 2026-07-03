import os

file_path = r'C:\Users\petrf\OneDrive\Desktop\ботдсдубина\discord-manager\bot.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Remove duplicate donat lines that are outside objects
    if "donat: 'Как получить" in line and "texts" not in line:
        # Check if this is inside a const texts = { block or not
        # Look backwards for "const texts" or "};"
        found_texts = False
        for j in range(i-1, max(i-5, 0), -1):
            if 'const texts' in lines[j]:
                found_texts = True
                break
            if '};' in lines[j]:
                break
        if not found_texts:
            continue
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('OK')
