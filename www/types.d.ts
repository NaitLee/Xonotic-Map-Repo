
type FetchedItemsMeta = {
    bspkeys: Record<string, number>,
    amount: number,
    data1size: number,
    data2size: number,
    datakeys: Record<string, number>,
    datatype: Record<string, number>,
    entity: Record<string, number>,
    gametype: Record<string, number>,
}

type Config = {
    upstream: {
        mapshots: string,
        download: string
    },
    load: {
        meta_url: string,
        data1_url: string,
        data2_url: string,
        maps_json?: string
    },
    entity_blacklist: string[],
    gamemode_blacklist: string[],
}

type MapsMeta = {
    bspkeys: Record<number, string>,
    amount: number,
    data1size: number,
    data2size: number,
    datakeys: Record<number, string>,
    datatype: Record<number, string>,
    entity: Record<number, string>,
    gametype: Record<string, number>,
}

type MapData = {
    pk3: string,
    date: number,
    filesize: number,
    shasum: Uint8Array,
    bsp: Record<string, MapDataBsp>,
}
type MapDataBsp = {
    author: string,
    description: string,
    entities: number[],
    gametypes: number,
    license: boolean,
    map: string,
    mapinfo: string,
    mapshot: string,
    radar: string,
    title: string,
    waypoints: string,
}

type FilterHowto = {
    keyword?: string,
    sizeMin?: number,
    sizeMax?: number,
    timeAfter?: number,
    timeBefore?: number,
    withMapshot?: boolean,
    withWaypoint?: boolean,
    withDescription?: boolean,
    withGametype?: Record<string, number>,
    key?: 'name' | 'size' | 'date' | 'random',
    invert?: boolean,
}
