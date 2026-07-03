import os

file_path = r'C:\Users\petrf\OneDrive\Desktop\ботдсдубина\discord-manager\bot.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update donat desc in ticket thread
old_desc = "      ? '**\\u0414\\u043b\\u044f \\u043f\\u043e\\u043b\\u0443\\u0447\\u0435\\u043d\\u0438\\u044f \\u0440\\u043e\\u043b\\u0438, \\u0441\\u043e\\u043e\\u0442\\u0432\\u0435\\u0442\\u0441\\u0442\\u0432\\u0443\\u044e\\u0449\\u0435\\u0439 \\u0432\\u0430\\u0448\\u0435\\u0439 \\u043f\\u0440\\u0438\\u0432\\u0438\\u043b\\u0435\\u0433\\u0438\\u0438, \\u043e\\u0441\\u0442\\u0430\\u0432\\u044c\\u0442\\u0435 \\u0437\\u0430\\u044f\\u0432\\u043a\\u0443 \\u043f\\u043e \\u0444\\u043e\\u0440\\u043c\\u0435:**\\n\\n1\\uFE0F\\u20E3 **\\u0412\\u0430\\u0448 \\u043d\\u0438\\u043a \\u043d\\u0430 \\u0441\\u0435\\u0440\\u0432\\u0435\\u0440\\u0435.**\\n2\\uFE0F\\u20E3 **\\u0412\\u0430\\u0448\\u0430 \\u043f\\u0440\\u0438\\u0432\\u0438\\u043b\\u0435\\u0433\\u0438\\u044f \\u043d\\u0430 \\u0441\\u0435\\u0440\\u0432\\u0435\\u0440\\u0435.**\\n3\\uFE0F\\u20E3 **\\u041f\\u0440\\u0438\\u043b\\u043e\\u0436\\u0438\\u0442\\u0435 \\u0441\\u043a\\u0440\\u0438\\u043d\\u0448\\u043e\\u0442**'"

new_desc = "      ? '**\\u2b50 \\u041a\\u0430\\u043a \\u043f\\u043e\\u043b\\u0443\\u0447\\u0438\\u0442\\u044c \\u0440\\u043e\\u043b\\u044c, \\u0441\\u043e\\u043e\\u0442\\u0432\\u0435\\u0442\\u0441\\u0442\\u0432\\u0443\\u044e\\u0449\\u0443\\u044e \\u0432\\u0430\\u0448\\u0435\\u0439 \\u043f\\u0440\\u0438\\u0432\\u0438\\u043b\\u0435\\u0433\\u0438\\u0438?**\\n\\n\\u0414\\u043b\\u044f \\u043f\\u043e\\u043b\\u0443\\u0447\\u0435\\u043d\\u0438\\u044f \\u0440\\u043e\\u043b\\u0438, \\u043e\\u0441\\u0442\\u0430\\u0432\\u044c\\u0442\\u0435 \\u0437\\u0430\\u044f\\u0432\\u043a\\u0443 \\u043f\\u043e \\u0444\\u043e\\u0440\\u043c\\u0435:\\n\\n\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\n\\n  \\u0031\\ufe0f\\u20e3 \\u0412\\u0430\\u0448 \\u043d\\u0438\\u043a \\u043d\\u0430 \\u0441\\u0435\\u0440\\u0432\\u0435\\u0440\\u0435.\\n\\n  \\u0032\\ufe0f\\u20e3 \\u0412\\u0430\\u0448\\u0430 \\u043f\\u0440\\u0438\\u0432\\u0438\\u043b\\u0435\\u0433\\u0438\\u044f \\u043d\\u0430 \\u0441\\u0435\\u0440\\u0432\\u0435\\u0440\\u0435.\\n\\n  \\u0033\\ufe0f\\u20e3 \\u041f\\u0440\\u0438\\u043b\\u043e\\u0436\\u0438\\u0442\\u0435 \\u0441\\u043a\\u0440\\u0438\\u043d\\u0448\\u043e\\u0442 \\u0438\\u0437 \\u0438\\u0433\\u0440\\u044b, \\u043d\\u0430 \\u043a\\u043e\\u0442\\u043e\\u0440\\u043e\\u043c:\\n     \\u2014 \\u0412 \\u0431\\u043e\\u043a\\u043e\\u0432\\u043e\\u0439 \\u043f\\u0430\\u043d\\u0435\\u043b\\u0438 \\u0432\\u0438\\u0434\\u043d\\u043e \\u0432\\u0430\\u0448\\u0443 \\u043f\\u0440\\u0438\\u0432\\u0438\\u043b\\u0435\\u0433\\u0438\\u044e.\\n     \\u2014 \\u0412\\u0441\\u0442\\u0430\\u0432\\u044c\\u0442\\u0435 \\u0441\\u0432\\u043e\\u0439 \\u0442\\u0435\\u0433 \\u0432 \\u0442\\u0435\\u043a\\u0441\\u0442\\u043e\\u0432\\u0443\\u044e \\u0441\\u0442\\u0440\\u043e\\u043a\\u0443.\\n     \\u2014 \\u041e\\u0442\\u043f\\u0440\\u0430\\u0432\\u043b\\u044f\\u0442\\u044c \\u0442\\u0435\\u0433 \\u0432 \\u0447\\u0430\\u0442 \\u043d\\u0435 \\u043d\\u0443\\u0436\\u043d\\u043e!\\n     \\u2014 \\u041f\\u0440\\u0438\\u043c\\u0435\\u0440 \\u0441\\u043a\\u0440\\u0438\\u043d\\u0448\\u043e\\u0442\\u0430 \\u043f\\u043e\\u0434 \\u0441\\u043e\\u043e\\u0431\\u0449\\u0435\\u043d\\u0438\\u0435\\u043c.\\n\\n\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500'"

if old_desc in content:
    content = content.replace(old_desc, new_desc)
    print('OK - donat desc updated')
else:
    print('Old donat desc not found')

# 2. Add image attachment after embed send
old_send = "    await thread.send({ embeds: [embed], components: [closeBtn] });"

new_send = """    // Send with image for donat tickets
    const sendOpts = { embeds: [embed], components: [closeBtn] };
    if (type === 'donat') {
      const fs = require('fs');
      const pathMod = require('path');
      const imgPath = pathMod.join(__dirname, 'dont.png');
      if (fs.existsSync(imgPath)) {
        const { AttachmentBuilder } = require('discord.js');
        const attachment = new AttachmentBuilder(imgPath, { name: 'example.png' });
        sendOpts.files = [attachment];
        embed.image = { url: 'attachment://example.png' };
      }
    }
    await thread.send(sendOpts);"""

if old_send in content:
    content = content.replace(old_send, new_send)
    print('OK - image attachment added')
else:
    print('Thread send not found')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('File saved')
