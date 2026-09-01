const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ChannelType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Veri Tabanı Simülasyonu (Bellek Üzerinde Tutan Yapı)
const db = {
    blacklistUsers: [], 
    blacklistServers: [], 
    ticketRoles: {
        genel: [],
        oyun: [],
        sunucu: []
    },
    logs: {
        ban: null,
        channelCreate: null,
        channelDelete: null,
        roleCreate: null,
        roleDelete: null,
        kick: null,
        messageDelete: null
    }
};

client.once('ready', async () => {
    console.log(`[BİLGİ] Bot başarıyla aktif edildi: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('karaliste_kur')
            .setDescription('Karaliste yönetim panelini kurar.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('karaliste_kisiler')
            .setDescription('Karalistede bulunan kişileri listeler.'),

        new SlashCommandBuilder()
            .setName('karaliste_sunucular')
            .setDescription('Karalistede bulunan sunucuları listeler.'),

        new SlashCommandBuilder()
            .setName('ticket_kur')
            .setDescription('Destek bilet sistemini kurar.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('ticket_rol_ekle')
            .setDescription('Kategorilere yetkili rolü tanımlar.')
            .addStringOption(option =>
                option.setName('kategori')
                    .setDescription('İşlem yapılacak kategori')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Genel Destek', value: 'genel' },
                        { name: 'Oyun Destek', value: 'oyun' },
                        { name: 'Sunucu Destek', value: 'sunucu' }
                    ))
            .addRoleOption(option =>
                option.setName('rol')
                    .setDescription('Yetkilendirilecek rol')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('log_setup')
            .setDescription('Log kanallarını yapılandırır.')
            .addChannelOption(option =>
                option.setName('kanal')
                    .setDescription('Logların gönderileceği kanal')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        // Moderasyon Komutları
        new SlashCommandBuilder()
            .setName('sil')
            .setDescription('Belirtilen miktarda mesaj siler.')
            .addIntegerOption(option => option.setName('sayi').setDescription('Silinecek mesaj sayısı').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

        new SlashCommandBuilder()
            .setName('ban')
            .setDescription('Belirtilen kullanıcıyı sunucudan yasaklar.')
            .addUserOption(option => option.setName('kullanici').setDescription('Yasaklanacak kullanıcı').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

        new SlashCommandBuilder()
            .setName('kick')
            .setDescription('Belirtilen kullanıcıyı sunucudan atar.')
            .addUserOption(option => option.setName('kullanici').setDescription('Atılacak kullanıcı').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

        new SlashCommandBuilder()
            .setName('kanal_ekle')
            .setDescription('Yeni bir metin kanalı oluşturur.')
            .addStringOption(option => option.setName('isim').setDescription('Kanal ismi').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

        new SlashCommandBuilder()
            .setName('kanal_sil')
            .setDescription('Belirtilen kanalı siler.')
            .addChannelOption(option => option.setName('kanal').setDescription('Silinecek kanal').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

        new SlashCommandBuilder()
            .setName('lock')
            .setDescription('Mevcut kanalı yazışmaya kapatır.')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

        new SlashCommandBuilder()
            .setName('unlock')
            .setDescription('Mevcut kanalı yazışmaya açar.')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

        new SlashCommandBuilder()
            .setName('mute')
            .setDescription('Belirtilen kullanıcıya zaman aşımı uygular.')
            .addUserOption(option => option.setName('kullanici').setDescription('Susturulacak kullanıcı').setRequired(true))
            .addIntegerOption(option => option.setName('sure').setDescription('Süre (dakika)').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

        new SlashCommandBuilder()
            .setName('rol_ver')
            .setDescription('Kullanıcıya rol verir.')
            .addUserOption(option => option.setName('kullanici').setDescription('Hedef kullanıcı').setRequired(true))
            .addRoleOption(option => option.setName('rol').setDescription('Verilecek rol').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

        new SlashCommandBuilder()
            .setName('rol_kaldir')
            .setDescription('Kullanıcıdan rol alır.')
            .addUserOption(option => option.setName('kullanici').setDescription('Hedef kullanıcı').setRequired(true))
            .addRoleOption(option => option.setName('rol').setDescription('Alınacak rol').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

        new SlashCommandBuilder()
            .setName('rol_ekle')
            .setDescription('Sunucuda yeni bir rol oluşturur.')
            .addStringOption(option => option.setName('isim').setDescription('Rol ismi').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

        new SlashCommandBuilder()
            .setName('rol_sil')
            .setDescription('Sunucudan belirtilen rolü siler.')
            .addRoleOption(option => option.setName('rol').setDescription('Silinecek rol').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    ];

    const rest = new REST({ version: '10' }).setToken("MTU0NDM1ODYzNjc1Nzg0NDEyMA.GshUlK.U6zfwtmukrjhWxMbNCvndJc-xby3Bi6i3ekbBA");
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('[BİLGİ] Slash komutları başarıyla kaydedildi.');
    } catch (error) {
        console.error(error);
    }
});

// Mesaj Tabanlı Komutlar ve T! Yardim Sistemi
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('t!')) return;

    const args = message.content.slice(2).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'yardım' || command === 'yardim') {
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('🛡️ TMS - Yardım ve Komut Menüsü')
            .setDescription('Aşağıda TMS Bot bünyesinde bulunan tüm komutların listesi kategorize edilmiş olarak yer almaktadır.')
            .addFields(
                { 
                    name: '🚫 Karaliste Sistemi', 
                    value: '`/karaliste_kur` - Karaliste yönetim panelini kurar.\n`/karaliste_kisiler` - Karalistede bulunan kişileri listeler.\n`/karaliste_sunucular` - Karalistede bulunan sunucuları listeler.' 
                },
                { 
                    name: '🎫 Destek (Ticket) Sistemi', 
                    value: '`/ticket_kur` - Destek bilet panelini kurar.\n`/ticket_rol_ekle` - Belirtilen kategoriye yetkili rolü tanımlar.\n*• Genel Destek:* Ordu Yönetimi, Moderatör Ekibi, Sunucu Yöneticisi\n*• Oyun Destek:* Ordu Yönetimi\n*• Sunucu Destek:* Moderatör Ekibi, Sunucu Yöneticisi, Ordu Yönetimi' 
                },
                { 
                    name: '⚙️ Sistem ve Log', 
                    value: '`/log_setup` - Log kanallarını yapılandırır.' 
                },
                { 
                    name: '🛡️ Moderasyon Komutları', 
                    value: '`t!sil`, `t!ban`, `t!kick`, `t!kanal_ekle`, `t!kanal_sil`, `t!lock`, `t!unlock`, `t!mute`, `t!rol_ver`, `t!rol_kaldir`, `t!rol_ekle`, `t!rol_sil`' 
                }
            )
            .setFooter({ text: 'TMS Güvenlik ve Yönetim Sistemi', iconURL: message.guild.iconURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('yardim_bilgi')
                .setLabel('TMS Destek Paneli Aktif')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
});

// Etkileşim Yönetimi (Slash Komutlar, Butonlar ve Modaller)
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'karaliste_kur') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ TMS Karaliste Yönetim Merkezi')
                .setDescription('Sunucu güvenliğini sağlamak amacıyla karaliste kayıtlarını aşağıdaki şık paneller üzerinden yönetebilirsiniz.')
                .setColor(0xED4245)
                .setThumbnail(interaction.guild.iconURL());

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('kl_kisi_ekle').setLabel('Kişi Ekle').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('kl_kisi_cikar').setLabel('Kişi Çıkar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('kl_sunucu_ekle').setLabel('Sunucu Ekle').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('kl_sunucu_cikar').setLabel('Sunucu Çıkar').setStyle(ButtonStyle.Success)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        } 
         
        else if (commandName === 'karaliste_kisiler') {
            if (db.blacklistUsers.length === 0) {
                return interaction.reply({ content: '⚠️ Karalistede kayıtlı herhangi bir kişi bulunmamaktadır.', ephemeral: true });
            }
            const list = db.blacklistUsers.map((u, i) => `**${i+1}.** Roblox ID: \`${u.robloxId}\` | Roblox İsim: \`${u.robloxName}\` | Discord: \`${u.discordName}\``).join('\n');
            const embed = new EmbedBuilder().setTitle('📋 Karalisteki Kişiler').setDescription(list).setColor(0xED4245);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } 
         
        else if (commandName === 'karaliste_sunucular') {
            if (db.blacklistServers.length === 0) {
                return interaction.reply({ content: '⚠️ Karalistede kayıtlı herhangi bir sunucu bulunmamaktadır.', ephemeral: true });
            }
            const list = db.blacklistServers.map((s, i) => `**${i+1}.** Sunucu Adı: \`${s.serverName}\``).join('\n');
            const embed = new EmbedBuilder().setTitle('📋 Karalisteki Sunucular').setDescription(list).setColor(0xED4245);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (commandName === 'ticket_kur') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 TMS Destek ve Yardım Merkezi')
                .setDescription('Yardıma mı ihtiyacınız var? Lütfen aşağıda yer alan destek kategorilerinden size uygun olanı seçerek talep oluşturun.')
                .setColor(0x5865F2)
                .setThumbnail(interaction.guild.iconURL());

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_genel').setLabel('Genel Destek').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_oyun').setLabel('Oyun Destek').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_sunucu').setLabel('Sunucu Destek').setStyle(ButtonStyle.Success)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }

        else if (commandName === 'ticket_rol_ekle') {
            const kat = interaction.options.getString('kategori');
            const rol = interaction.options.getRole('rol');
            db.ticketRoles[kat].push(rol.id);
            await interaction.reply({ content: `✅ Başarıyla **${kat}** kategorisine **${rol.name}** yetkili rolü eklendi.`, ephemeral: true });
        }

        else if (commandName === 'log_setup') {
            const kanal = interaction.options.getChannel('kanal');
            db.logs.ban = kanal.id;
            db.logs.channelCreate = kanal.id;
            db.logs.channelDelete = kanal.id;
            db.logs.roleCreate = kanal.id;
            db.logs.roleDelete = kanal.id;
            db.logs.kick = kanal.id;
            db.logs.messageDelete = kanal.id;
            await interaction.reply({ content: `✅ Log kanalları başarıyla <#${kanal.id}> olarak yapılandırıldı.`, ephemeral: true });
        }

        // Moderasyon İşlemleri
        else if (commandName === 'sil') {
            const sayi = interaction.options.getInteger('sayi');
            await interaction.channel.bulkDelete(sayi, true).catch(() => {});
            await interaction.reply({ content: `🧹 Başarıyla ${sayi} adet mesaj temizlendi.`, ephemeral: true });
        }
        else if (commandName === 'ban') {
            const user = interaction.options.getUser('kullanici');
            await interaction.guild.members.ban(user);
            await interaction.reply({ content: `🔨 **${user.tag}** isimli kullanıcı sunucudan yasaklandı.` });
        }
        else if (commandName === 'kick') {
            const user = interaction.options.getUser('kullanici');
            await interaction.guild.members.kick(user);
            await interaction.reply({ content: `👢 **${user.tag}** isimli kullanıcı sunucudan atıldı.` });
        }
        else if (commandName === 'kanal_ekle') {
            const isim = interaction.options.getString('isim');
            await interaction.guild.channels.create({ name: isim, type: ChannelType.GuildText });
            await interaction.reply({ content: `📁 **${isim}** kanalı oluşturuldu.`, ephemeral: true });
        }
        else if (commandName === 'kanal_sil') {
            const kanal = interaction.options.getChannel('kanal');
            await kanal.delete();
            await interaction.reply({ content: `🗑️ Belirtilen kanal silindi.`, ephemeral: true });
        }
        else if (commandName === 'lock') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            await interaction.reply({ content: '🔒 Kanal metin yazışmalarına kapatıldı.' });
        }
        else if (commandName === 'unlock') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
            await interaction.reply({ content: '🔓 Kanal metin yazışmalarına açıldı.' });
        }
        else if (commandName === 'mute') {
            const user = interaction.options.getUser('kullanici');
            const sure = interaction.options.getInteger('sure');
            const member = await interaction.guild.members.fetch(user.id);
            await member.timeout(sure * 60 * 1000);
            await interaction.reply({ content: `🔇 **${user.tag}** kullanıcısına ${sure} dakika zaman aşımı uygulandı.` });
        }
        else if (commandName === 'rol_ver') {
            const user = interaction.options.getUser('kullanici');
            const rol = interaction.options.getRole('rol');
            const member = await interaction.guild.members.fetch(user.id);
            await member.roles.add(rol);
            await interaction.reply({ content: `➕ **${user.tag}** kullanıcısına **${rol.name}** rolü verildi.` });
        }
        else if (commandName === 'rol_kaldir') {
            const user = interaction.options.getUser('kullanici');
            const rol = interaction.options.getRole('rol');
            const member = await interaction.guild.members.fetch(user.id);
            await member.roles.remove(rol);
            await interaction.reply({ content: `➖ **${user.tag}** kullanıcısından **${rol.name}** rolü alındı.` });
        }
        else if (commandName === 'rol_ekle') {
            const isim = interaction.options.getString('isim');
            await interaction.guild.roles.create({ name: isim });
            await interaction.reply({ content: `🏷️ **${isim}** isimli rol oluşturuldu.`, ephemeral: true });
        }
        else if (commandName === 'rol_sil') {
            const rol = interaction.options.getRole('rol');
            await rol.delete();
            await interaction.reply({ content: `🗑️ Belirtilen rol sistemden silindi.`, ephemeral: true });
        }
    } 
     
    else if (interaction.isButton()) {
        if (interaction.customId === 'kl_kisi_ekle') {
            const modal = new ModalBuilder().setCustomId('modal_kl_kisi_ekle').setTitle('Karaliste Kişi Ekle');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('r_id').setLabel('Roblox ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('r_isim').setLabel('Roblox İsim').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('d_isim').setLabel('Discord İsim').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        } 
        else if (interaction.customId === 'kl_kisi_cikar') {
            const modal = new ModalBuilder().setCustomId('modal_kl_kisi_cikar').setTitle('Karaliste Kişi Çıkar');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('k_bilgi').setLabel('Roblox ID veya Roblox İsim').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        } 
        else if (interaction.customId === 'kl_sunucu_ekle') {
            const modal = new ModalBuilder().setCustomId('modal_kl_sunucu_ekle').setTitle('Karaliste Sunucu Ekle');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_isim').setLabel('Sunucu İsmi').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        } 
        else if (interaction.customId === 'kl_sunucu_cikar') {
            const modal = new ModalBuilder().setCustomId('modal_kl_sunucu_cikar').setTitle('Karaliste Sunucu Çıkar');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s_isim').setLabel('Sunucu İsmi').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }
        else if (['ticket_genel', 'ticket_oyun', 'ticket_sunucu'].includes(interaction.customId)) {
            const categoryName = interaction.customId.replace('ticket_', '');
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            await interaction.reply({ content: `✅ Destek talebiniz oluşturuldu: <#${channel.id}>`, ephemeral: true });
        }
    } 
     
    else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_kl_kisi_ekle') {
            const robloxId = interaction.fields.getTextInputValue('r_id');
            const robloxName = interaction.fields.getTextInputValue('r_isim');
            const discordName = interaction.fields.getTextInputValue('d_isim');
            db.blacklistUsers.push({ robloxId, robloxName, discordName });
            await interaction.reply({ content: `✅ **${robloxName}** başarıyla karalisteye eklendi.`, ephemeral: true });
        } 
        else if (interaction.customId === 'modal_kl_kisi_cikar') {
            const bilgi = interaction.fields.getTextInputValue('k_bilgi');
            const index = db.blacklistUsers.findIndex(u => u.robloxId === bilgi || u.robloxName === bilgi);
            if (index !== -1) {
                db.blacklistUsers.splice(index, 1);
                await interaction.reply({ content: `✅ Kişi karalisteden başarıyla kaldırıldı.`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ Belirtilen kriterlere uygun kayıt bulunamadı.`, ephemeral: true });
            }
        }
        else if (interaction.customId === 'modal_kl_sunucu_ekle') {
            const serverName = interaction.fields.getTextInputValue('s_isim');
            db.blacklistServers.push({ serverName });
            await interaction.reply({ content: `✅ **${serverName}** karaliste sunucularına eklendi.`, ephemeral: true });
        }
        else if (interaction.customId === 'modal_kl_sunucu_cikar') {
            const serverName = interaction.fields.getTextInputValue('s_isim');
            const index = db.blacklistServers.findIndex(s => s.serverName === serverName);
            if (index !== -1) {
                db.blacklistServers.splice(index, 1);
                await interaction.reply({ content: `✅ **${serverName}** sunucusu karalisteden çıkarıldı.`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ Belirtilen sunucu listede bulunamadı.`, ephemeral: true });
            }
        }
    }
});

// Log Sistemleri Entegrasyonu
client.on('messageDelete', async message => {
    if (!db.logs.messageDelete || message.partial) return;
    const channel = message.guild.channels.cache.get(db.logs.messageDelete);
    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle('📌 Log - Silinen Mesaj')
            .addFields(
                { name: 'Kullanıcı', value: `${message.author?.tag || 'Bilinmiyor'}`, inline: true },
                { name: 'Kanal', value: `${message.channel.name}`, inline: true },
                { name: 'İçerik', value: `${message.content || 'İçerik bulunmuyor (Görsel vb.)'}` }
            )
            .setColor(0xFEE75C)
            .setTimestamp();
        channel.send({ embeds: [embed] }).catch(() => {});
    }
});

client.on('channelCreate', async channel => {
    if (!db.logs.channelCreate) return;
    const logChannel = channel.guild.channels.cache.get(db.logs.channelCreate);
    if (logChannel) {
        logChannel.send(`📁 **[LOG]** Yeni bir kanal oluşturuldu: **${channel.name}**`).catch(() => {});
    }
});

client.on('channelDelete', async channel => {
    if (!db.logs.channelDelete) return;
    const logChannel = channel.guild.channels.cache.get(db.logs.channelDelete);
    if (logChannel) {
        logChannel.send(`🗑️ **[LOG]** Bir kanal silindi: **${channel.name}**`).catch(() => {});
    }
});

client.on('roleCreate', async role => {
    if (!db.logs.roleCreate) return;
    const logChannel = role.guild.channels.cache.get(db.logs.roleCreate);
    if (logChannel) {
        logChannel.send(`🏷️ **[LOG]** Yeni bir rol oluşturuldu: **${role.name}**`).catch(() => {});
    }
});

client.on('roleDelete', async role => {
    if (!db.logs.roleDelete) return;
    const logChannel = role.guild.channels.cache.get(db.logs.roleDelete);
    if (logChannel) {
        logChannel.send(`🗑️ **[LOG]** Bir rol silindi: **${role.name}**`).catch(() => {});
    }
});

// Bot Giriş İşlemi
client.login("MTU0NDM1ODYzNjc1Nzg0NDEyMA.GshUlK.U6zfwtmukrjhWxMbNCvndJc-xby3Bi6i3ekbBA");