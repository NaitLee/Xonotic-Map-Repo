
// rough script for taking some translations from official source

const xondatadir = Deno.args[0];

if (xondatadir === undefined) {
    console.error(`Pass a directory that contains Xonotic translation resources, then re-run.
    It's Typically \`xonotic.git/data/xonotic-data.pk3dir\`.`);
    Deno.exit(1);
}

// en_US is source; zh will be manually managed and converted
const blacklist_lang = new Set(['en_US', 'zh_CN', 'zh_HK', 'zh_TW']);
const languages = [];

function trimstr(str: string, start: string, end: string) {
    return str.slice(start.length, str.length - end.length);
}

for await (const entry of Deno.readDir(xondatadir)) {
    if (entry.isFile && entry.name.startsWith('common.') && entry.name.endsWith('.po')) {
        const langname = trimstr(entry.name, 'common.', '.po');
        if (!blacklist_lang.has(langname)) languages.push(langname);
    }
}

const langkeys = {
    "all": "All",
    "as": "Assault",
    "arena": "Arena",
    "ca": "Clan Arena",
    "ctf": "Capture the Flag",
    "cts": "Race CTS",
    "inv": "Invasion",
    "ka": "Keepaway",
    "dm": "Deathmatch",
    "dom": "Domination",
    "lms": "Last Man Standing",
    "ons": "Onslaught",
    "tdm": "Team Deathmatch",
    "kh": "Key Hunt",
    "ft": "Freeze Tag",
    "rc": "Race",
    "nb": "Nexball",
    "inf": "Infection",
    "jb": "Jailbreak",
    "info_player_deathmatch": "Normal Spawnpoints",
    "info_player_team1": "Red Team Spawnpoints",
    "info_player_team2": "Blue Team Spawnpoints",
    "info_player_team3": "Yellow Team Spawnpoints",
    "info_player_team4": "Pink Team Spawnpoints",
    "item_armor_big": "Big Armor",
    "item_armor_large": "Mega Armor",
    "item_armor_medium": "Medium Armor",
    "item_armor_small": "Small Armor",
    "item_bullets": "Bullets",
    "item_cells": "Cells",
    "item_flag_neutral": "Neutral Flag",
    "item_flag_team1": "Red Flag",
    "item_flag_team2": "Blue Flag",
    "item_flag_team3": "Yellow Flag",
    "item_flag_team4": "Pink Flag",
    "item_health_large": "Mega Health",
    "item_health_medium": "Medium Health",
    "item_health_mega": "Mega Health",
    "item_health_small": "Small Health",
    "item_invincible": "Invincible",
    "item_minst_cells": "Vaporizer Ammo",
    "item_rockets": "Rockets",
    "item_shells": "Shells",
    "item_strength": "Strength",
    "weapon_arc": "Arc",
    "weapon_blaster": "Blaster",
    "weapon_crylink": "Crylink",
    "weapon_devastator": "Devastator",
    "weapon_electro": "Electro",
    "weapon_fireball": "Fireball",
    "weapon_grenadelauncher": "Mortar",
    "weapon_hagar": "Hagar",
    "weapon_hook": "Hook",
    "weapon_machinegun": "MachineGun",
    "weapon_minelayer": "Mine Layer",
    "weapon_rifle": "Rifle",
    "weapon_seeker": "T.A.G. Seeker",
    "weapon_shotgun": "Shotgun",
    "weapon_vaporizer": "Vaporizer",
    "weapon_vortex": "Vortex",
    "world": "World"
};

for await (const lang of languages) {
    const json_path = `${lang.replaceAll('_', '-')}.json`;
    const json = JSON.parse(await Deno.readTextFile(json_path).catch(_ => '{}'));
    const po_path = `${xondatadir}/common.${lang}.po`;
    const lines = (await Deno.readTextFile(po_path)).split('\n');
    if (!json['Language']) json['Language'] = lang;
    for (const entitykey in langkeys) {
        //@ts-ignore: entitykey: keyof langkeys
        const sourcekey: string = langkeys[entitykey];
        const idindex = lines.findIndex(value => trimstr(value, 'msgid "', '"').toLowerCase() === sourcekey.toLowerCase());
        if (idindex === -1) {
            if (json[entitykey]) json[entitykey] = '';
            continue;
        }
        const str = trimstr(lines[idindex + 1], 'msgstr "', '"');
        if (str !== '') json[entitykey] = str;
    }
    if (Object.keys(json).length < Object.keys(langkeys).length / 3) continue;
    await Deno.writeTextFile(json_path, JSON.stringify(json, void 0, 4));
}
