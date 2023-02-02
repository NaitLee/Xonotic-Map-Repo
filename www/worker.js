
/**
 * Reverse some objects in the fetched maps-meta.json
 * @param {any} meta
 * @param  {...string} keys
 */
function correctMeta(meta, ...keys) {
    for (const key of keys) {
        const b = {};
        for (const k in meta[key]) {
            b[meta[key][k]] = k;
        }
        meta[key] = b;
    }
}

class Binary extends DataView {
    size;
    buffer;
    array;
    available;
    pointer;
    signed;
    littleEndian;
    constructor(size) {
        const buffer = new ArrayBuffer(size);
        super(buffer); // new DataView(this.buffer);
        this.buffer = buffer;
        this.array = new Uint8Array(this.buffer);
        this.size = size;
        this.available = 0;
        this.pointer = 0;
        this.signed = true;
        this.littleEndian = true;
    }
    expand(buffer) {
        for (let i = 0; i < buffer.length; i++) {
            this.array[this.available++] = buffer[i];
        }
    }
    get(size = 4, float = false, signed = this.signed) {
        const pointer = this.pointer;
        if (pointer >= this.available)
            throw new Error('Unavailable');
        this.pointer += size;
        switch (size) {
        case 1:
            return signed ? this.getInt8(pointer) : this.getUint8(pointer);
        case 2:
            return signed ? this.getInt16(pointer, this.littleEndian) : this.getUint16(pointer, this.littleEndian);
        case 4:
            return float ? this.getFloat32(pointer, this.littleEndian) : (signed ? this.getInt32(pointer, this.littleEndian) : this.getUint32(pointer, this.littleEndian));
        case 8:
            return this.getFloat64(pointer, this.littleEndian);
        }
        return NaN;
    }
    getchunk(offset) {
        if (offset >= this.available)
            throw new Error(`Unavailable: needs ${offset}, have ${this.available}`);
        const length = this.getUint16(offset + 1, this.littleEndian);
        if (offset + length >= this.available)
            throw new Error(`Unavailable: needs ${offset + length}, have ${this.available}`);
        // this.seek(offset);
        const data = this.array.subarray(offset + 3, offset + length + 3);
        return data;
    }
    seek(offset, whence = 0) {
        const pointer = whence === 0 ? offset : this.pointer + offset;
        if (pointer >= this.available)
            throw new Error(`Unavailable: needs ${pointer}, have ${this.available}`);
        this.pointer = pointer;
    }
}

class MapLoader {
    /** @type {MapsMeta} */
    meta;
    /** @type {MapData[]} */
    data;
    /** @type {number[]} */
    order;
    /** @type {number[]} */
    filteredOrder;
    constructor() {
        self.addEventListener('message', ev => {
            const { type, data } = ev.data;
            switch (type) {
            case 'loadmap':
                this.load(data);
                break;
            case 'get':
                this.get(data);
                break;
            case 'filter':
                this.filter(data);
                break;
            }
        });
    }
    post(type, data) {
        self.postMessage({ type, data });
    }
    get({ at, amount }) {
        this.post('amount', this.filteredOrder.length);
        this.post('data', this.filteredOrder.slice(at, at + amount).map(n => this.data[n]));
    }
    async load({ meta_url, data1_url, data2_url, maps_json }) {
        /** @type {MapsMeta} */
        const meta = await fetch(meta_url).then(r => r.json());
        correctMeta(meta, 'bspkeys', 'datakeys', 'datatype', 'entity');
        this.meta = meta;
        this.filteredOrder = this.order = [];
        this.post('meta', meta);
        if (maps_json) {
            this.data = await fetch(maps_json).then(r => r.json()).then(j => j.data);
            for (let i = 0; i < this.data.length; i++)
                this.order[i] = i;
            this.post('loadstat', this.data.length);
            this.post('ready');
            return;
        }
        /** @type {MapData[]} */
        const data_list = this.data = [];
        let count = 0, error_count = 0;
        const reader1 = (await fetch(data1_url).then(r => r.body)).getReader();
        const reader2 = (await fetch(data2_url).then(r => r.body)).getReader();
        const bin1 = new Binary(meta.data1size);
        const bin2 = new Binary(meta.data2size);
        bin1.signed = bin2.signed = false;
        let threshold = 128 * 1024;
        /** @type {(buffer: Uint8Array) => string} */
        const utf8 = (function() {
            const decoder = new TextDecoder();
            return buffer => decoder.decode(buffer, { stream: true });
        })();
        const string_here = () => utf8(bin2.getchunk(bin1.get(4)));
        /** @type {() => MapData} */
        const new_data = () => ({
            pk3: '',
            date: null,
            filesize: 0,
            shasum: null,
            bsp: {},
        });
        /** @type {(name: string) => MapDataBsp} */
        const new_bsp = (name) => ({
            author: '',
            description: '',
            entities: new Array(Object.keys(meta.entity).length + 1).fill(0),
            gametypes: 0,
            license: false,
            map: '',
            mapinfo: '', // `maps/${name}.mapinfo`,
            mapshot: '', // `maps/${name}.jpg`,
            radar: '', // `gfx/${name}.tga`,
            title: name,
            waypoints: '',
        });
        let anchor1 = 1;
        bin1.pointer = anchor1;
        while (count < meta.amount) {
            try {
                const data = new_data();
                anchor1 = bin1.pointer;
                let k1, k2, mark2, string, bsp_name, entities;
                let current_bsp;
                for (let i = 0; i < Object.keys(meta.datakeys).length; i++) {
                    switch (k1 = meta.datakeys[bin1.get(1)]) {
                    case 'filesize':
                        data[k1] = bin1.get(4);
                        break;
                    case 'date':
                        data[k1] = bin1.get(4);
                        break;
                    case 'pk3':
                        data[k1] = string_here() + '.pk3';
                        break;
                    case 'shasum':
                        data[k1] = bin2.getchunk(bin1.get(4));
                        break;
                    case 'bsp':
                        while ((mark2 = bin1.get(1)) !== 0) {
                            switch (k2 = meta.bspkeys[mark2]) {
                            case 'name':
                                bsp_name = string_here();
                                data[k1][bsp_name] = current_bsp = new_bsp(bsp_name);
                                break;
                            case 'license':
                                current_bsp[k2] = true;
                                break;
                            case 'gametypes':
                                current_bsp[k2] = bin1.get(4);
                                break;
                            case 'entities':
                                entities = bin2.getchunk(bin1.get(4));
                                for (let i = 0; i < entities.length; i += 3)
                                    current_bsp[k2][entities[i]] = entities[i + 1] | (entities[i + 2] << 8);
                                break;
                            default:
                                string = string_here();
                                switch (k2) {
                                    case 'map':
                                    case 'title':
                                    case 'description':
                                    case 'author':
                                        current_bsp[k2] = string;
                                        break;
                                    case 'mapshot':
                                    case 'mapinfo':
                                    case 'waypoints':
                                        current_bsp[k2] = 'maps/' + bsp_name + string;
                                        break;
                                    case 'radar':
                                        current_bsp[k2] = 'gfx/' + bsp_name + string;
                                        break;
                                }
                            }
                        }
                        break;
                    }
                }
                bin1.get(1);
                this.order[count] = count++;
                data_list.push(data);
                if (count % (meta.amount / 10 | 0) === 0)
                    this.post('loadstat', count);
            } catch (err) {
                error_count += 1;
                if (error_count >= 64) {
                    const fatal = new Error(`Got ${error_count} failures, giving up.\nLast error:\n${err}`);
                    this.post('error', fatal.message);
                    throw fatal;
                }
                while (
                    (bin1.available < anchor1 + threshold) &&
                    (bin1.available < meta.data1size || bin2.available < meta.data2size)
                ) {
                    const result1 = await reader1.read();
                    const result2 = await reader2.read();
                    if (!result1.done && result1.value) bin1.expand(result1.value);
                    if (!result2.done && result2.value) bin2.expand(result2.value);
                }
                // double it to avoid some kind of error
                threshold *= 2;
                bin1.seek(anchor1);
            }
        }
        this.post('ready');
    }
    /**
     * 
     * @param {FilterHowto} howto 
     */
    filter(howto) {
        let order = this.order.slice(0);
        let jobs = Object.values(howto).filter(x => !!x).length,
            done = 0;
        let mask = 0;
        if (typeof howto.withGametype === 'object')
            for (const x of Object.values(howto.withGametype))
                mask |= x;
        if (mask === 0) jobs -= 1;
        
        const report = () => this.post('meter', ++done / jobs);

        if (howto.keyword)
            order = order.filter(n => {
                const data = this.data[n];
                const word = howto.keyword;
                if (data.pk3.toLocaleLowerCase().includes(word)) return true;
                for (const name in data.bsp) {
                    const bsp = data.bsp[name];
                    if (
                        name.toLocaleLowerCase().includes(word) ||
                        bsp.author.toLocaleLowerCase().includes(word) ||
                        bsp.description.toLocaleLowerCase().includes(word)
                    ) return true;
                }
                return false;
            }), report();
        if (howto.sizeMin)
            order = order.filter(n => this.data[n].filesize >= howto.sizeMin), report();
        if (howto.sizeMax)
            order = order.filter(n => this.data[n].filesize <= howto.sizeMax), report();
        if (howto.timeAfter)
            order = order.filter(n => this.data[n].date >= howto.timeAfter), report();
        if (howto.timeBefore)
            order = order.filter(n => this.data[n].date <= howto.timeBefore), report();
        if (howto.withMapshot)
            order = order.filter(n => {
                const bsps = this.data[n].bsp;
                for (const key in bsps)
                    if (bsps[key].mapshot) return true;
                return false;
            }), report();
        if (howto.withDescription)
            order = order.filter(n => {
                const bsps = this.data[n].bsp;
                for (const key in bsps)
                    if (bsps[key].description) return true;
                return false;
            }), report();
        if (howto.withWaypoint)
            order = order.filter(n => {
                const bsps = this.data[n].bsp;
                for (const key in bsps)
                    if (bsps[key].waypoints) return true;
                return false;
            }), report();
        if (mask !== 0)
            order = order.filter(n => {
                const bsps = this.data[n].bsp;
                for (const key in bsps)
                    if ((bsps[key].gametypes & mask) !== 0) return true;
                return false;
            }), report();
        
        this.filteredOrder = order;

        const collator = Intl.Collator(navigator.languages.concat());
        switch (howto.key) {
        case 'random':
            this.filteredOrder.sort(() => Math.random() - 0.5);
            break;
        case 'name':
            this.filteredOrder.sort((a, b) => {
                const d1 = this.data[a], d2 = this.data[b];
                const b1 = Object.keys(d1.bsp)[0], b2 = Object.keys(d2.bsp)[0];
                const s1 = d1.bsp[b1].title || b1 || d1.pk3, s2 = d2.bsp[b2].title || b2 || d2.pk3;
                return collator.compare(s1.toLocaleLowerCase(), s2.toLocaleLowerCase());
            });
            break;
        case 'size':
            this.filteredOrder.sort((a, b) => this.data[a].filesize - this.data[b].filesize);
            break;
        case 'time':
            this.filteredOrder.sort((a, b) => this.data[a].date - this.data[b].date);
            break;
        }
        report();

        if (howto.invert)
            this.filteredOrder.reverse(), report();

        this.post('ready');
    }
}

var loader = new MapLoader();
