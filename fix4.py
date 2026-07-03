import os

file_path = r'C:\Users\petrf\OneDrive\Desktop\ботдсдубина\discord-manager\bot.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove the duplicate donat line (line 222, 0-indexed = 221)
new_lines = []
for i, line in enumerate(lines):
    # Skip the duplicate donat line that's outside the texts object
    if i == 221 and "donat:" in line and "texts" not in line:
        continue
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('OK')
