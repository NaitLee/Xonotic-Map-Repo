
///<reference path="./types.d.ts" />
///<reference path="./utils.js" />

'use strict';

/** @type {Config} */
var Config;

/** @type {any} */
var i18n;
if (i18n === undefined) i18n = (s, t) => s + ',' + t.join(',');

const hiddenArea = document.getElementById('hidden');

const LazyImage = (function() {
    const observing = new Set();
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries)
            if (entry.isIntersecting) {
                /** @type {any} */
                let img = entry.target;
                img.src = img.dataset.src;
                img.dataset.src = '';
                img.className = '';
                observer.unobserve(img);
                observing.delete(img);
            }
    });
    return function(element, src) {
        element.dataset.src = src;
        if (!observing.has(element)) {
            observing.add(element);
            observer.observe(element);
        }
        return element;
    }
})();

class Item {
    element;
    data;
    pk3;
    /** @type {HTMLImageElement} */
    #mapshot;
    _mapshot;
    get mapshot() { return this._mapshot; }
    set mapshot(value) {
        if (this._mapshot === value) return;
        this._mapshot = value;
        if (value) {
            this.#mapshot.src = '';
            LazyImage(this.#mapshot, Config.upstream.mapshots + value);
        } else {
            this.#mapshot.dataset.src = '';
            this.#mapshot.src = 'image/no_mapshot.png';
        }
    }
    _name;
    get name() { return this._name; }
    set name(value) { this._name = value; }
    #title;
    _title;
    get title() { return this._title; }
    set title(value) { this.#title.innerText = (this._title = value) || this._name; }
    #author;
    _author;
    get author() { return this._author; }
    set author(value) {
        this.#author.innerText = value && i18n('by-0', [this._author = value]);
    }
    #filesize;
    _filesize;
    get filesize() { return this._filesize; }
    set filesize(value) {
        const size = (n) => {
            let units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
            if (typeof i18n !== 'undefined') units = units.map(s => i18n(s));
            let shifts = 1;
            while (n >= 1 << 20) n >>= 10, shifts++;
            return n > 1 << 10
                ? Math.round((n / 1024) * 10) / 10 + ' ' + units[shifts]
                : n + ' ' + units[0];
        }
        this.#filesize.innerText = size(this._filesize = value);
    }
    #date;
    _date;
    get date() { return this._date; }
    set date(value) {
        this._date = value;
        this.#date.innerText = value.getFullYear() + '-' + (value.getMonth() + 1);
    }
    #description;
    _description;
    get description() { return this._description; }
    set description(value) { this.#description.innerText = (this._description = value) || this._title; }
    #gametypes;
    _gametypes;
    get gametypes() { return this._gametypes; }
    setGametypes(types) {
        types = types.filter(s => !Config.gamemode_blacklist.includes(s));
        const children = this.#gametypes.children;
        for (let i = 0; i < types.length; i++) {
            let type = types[i];
            let type_i18n = i18n(type);
            let classname = 'icon-gametype_' + type;
            children.length > i
                // @ts-ignore
                ? (children[i].className = classname, children[i].title = type_i18n)
                : this.#gametypes.appendChild(e('i .' + classname + ' title=' + type_i18n.replace(/ /g, '+')));
        }
        for (let i = types.length; i < children.length; i++) {
            // @ts-ignore
            children[i].innerText = children[i].title = children[i].className = '';
        }
        this._gametypes = types;
    }
    #entities;
    _entities;
    get entities() { return this._entities; }
    setEntities(entities) {
        const children = this.#entities.children;
        let count = 0;
        for (let key in entities) {
            if (entities[key] === 0 || Config.entity_blacklist.includes(key)) continue;
            let key_i18n = i18n(key);
            let classname = 'icon-' + key;
            children.length > count
                // @ts-ignore
                ? (children[count].className = classname, children[count].title = key_i18n, children[count].innerText = entities[key])
                : this.#entities.appendChild(t(e('i .' + classname + ' title=' + key_i18n.replace(/ /g, '+')), entities[key]));
            count += 1;
        }
        for (let i = count; i < children.length; i++) {
            // @ts-ignore
            children[i].innerText = children[i].title = children[i].className = '';
        }
        this._entities = entities;
    }
    #links
    _links;
    get links() {
        return this._links;
    }
    setLinks(links) {
        const children = this.#links.children;
        let count = 0;
        for (let key in links) {
            children.length > count
                // @ts-ignore
                ? (children[count].href = links[key], children[count].innerText = key)
                : this.#links.appendChild(t(e('a href=' + links[key]), key));
        }
        for (let i = count; i < children.length; i++) {
            // @ts-ignore
            children[i].innerText = children[i].href = '';
        }
        this._links = links;
    }
    constructor() {
        const activate = () => el.classList.toggle('active');
        let el = this.element = e(' .item',
            // @ts-ignore
            this.#mapshot = a(e('img .mapshot loading=lazy'), { 'click': activate }),
            a(e(' .info',
                this.#title = e('span .title'),
                this.#author = e('span .author'),
                this.#date = e('span .date')
            ), { 'click': activate }),
            e(' .details',
                this.#description = e('span .description'),
                this.#filesize = e('span .filesize'),
                this.#gametypes = e('span .gametypes'),
                this.#entities = e('span .entities'),
                this.#links = e('span .links'),
                e('span .actions',
                    a(t(e('button'), 'download'), {
                        'click': this.download
                    }, this)
                ),
            )
        );
    }
    download() {
        e('a target=_blank href=' + Config.upstream.download + this.pk3).click();
    }
}

class Maps {
    /** @type {MapsMeta} */
    meta;
    /** @type {number} */
    index;
    /** @type {Item[]} */
    itemPool;
    // No "odd" lines in layout with 2, 3, 4, 5, or 6 items in one row
    mapsPerPage = 3 * 4 * 5;
    /** @type {HTMLElement} */
    #pageStat
    /** @type {HTMLElement} */
    #meter;
    /** @type {HTMLElement} */
    view;
    /** @type {Worker} */
    worker;
    amount;
    ready;
    filterHowto;
    constructor() {
        this.view = document.getElementById('items');
        this.index = this.amount = 0;
        this.ready = false;
        this.data = [];
        this.itemPool = [];
        let pages = e('p .pages',
            a(t(e('button .icon-previous'), 'previous'), {
                'click': () => (this.get(this.index - this.mapsPerPage), window.scrollTo(0, 0))
            }, this),
            this.#pageStat = t(e('span .pagestat'), 'loading'),
            a(t(e('button .icon-next'), 'next'), {
                'click': () => (this.get(this.index + this.mapsPerPage), window.scrollTo(0, 0))
            }, this),
            this.#meter = e(' .meter')
        );
        document.body.appendChild(pages);
        this.load();
    }
    initMenu() {
        document.querySelector('header').appendChild(e(' #menu',
            a(t(e('button'), 'search-sort-filter'), {
                'click': this.filter
            }, this),
            a(t(e('button'), 'random-pick'), {
                'click': this.random
            }, this),
            a(t(e('button'), 'toggle-view'), {
                'click': () => this.view.classList.toggle('active')
            })
        ));
    }
    initFilter() {
        /** @type {FilterHowto} */
        let f = this.filterHowto = {
            // @ts-ignore
            key: 'name',
            withGametype: {}
        };
        hiddenArea.appendChild(
            e(' #filter .form',
                e('span sort-by-'),
                e('span',
                    a(e('select',
                        ...['name', 'size', 'time'].map(s => t(e('option value=' + s), s))
                    ), {
                        change: ev => f.key = ev.target.value
                    }),
                    e('label', a(e('input type=checkbox'), {
                        change: ev => f.invert = ev.target.checked
                    }), e('span invert-order'))
                ),
                e('span keyword-'),
                e('span',
                    a(e('input type=text'), {
                        change: ev => (f.keyword = ev.target.value),
                    })
                ),
                e('span size-'),
                e('span',
                    a(e('select',
                            t(e('option value=0,0'), 'any'),
                            t(e('option value=0,2'), 'less-than-0', ['2 MiB']),
                            t(e('option value=2,20'), '0-to-1', [
                                '2 MiB',
                                '20 MiB',
                            ]),
                            t(e('option value=20,50'), '0-to-1', [
                                '20 MiB',
                                '50 MiB',
                            ]),
                            t(e('option value=50,0'), 'more-than-0', ['50 MiB'])
                        ),
                        {
                            change: ev =>
                                ([f.sizeMin, f.sizeMax] = ev.target.value
                                    .split(',').map(s => parseInt(s) << 20)),
                        }
                    )
                ),
                e('span time-'),
                e('span',
                    a(e(
                            'select',
                            t(e('option value=0,0'), 'any'),
                            t(e('option value=2,0'), 'in-0-year', [2]),
                            t(e('option value=5,0'), 'in-0-year', [5]),
                            t(e('option value=10,0'), 'in-0-year', [10]),
                            t(e('option value=0,10'), 'older-than-0-year', [10])
                        ),
                        {
                            change: ev =>
                                ([f.timeAfter, f.timeBefore] = ev.target.value
                                    .split(',')
                                    .map(s => {
                                        let offset_year = parseInt(s);
                                        if (offset_year === 0) return 0;
                                        let now = new Date();
                                        now.setFullYear(now.getFullYear() - offset_year);
                                        return (now.getTime() / 1e3) | 0;
                                    })),
                        }
                    )
                ),
                e('span gamemodes-'),
                e('span',
                    ...Object.entries(this.meta.gametype).map(([key, mask]) =>
                        Config.gamemode_blacklist.includes(key) ? null : e('label',
                            a(e('input type=checkbox value=' + mask), {
                                'change': ev => f.withGametype[key] = ev.target.checked ? mask : 0
                            }),
                            e('i .icon-gametype_' + key + ' ' + key)
                        )
                    ).filter(e => e !== null)
                ),
                e('span other-'),
                e('span',
                    e('label',
                        a(e('input type=checkbox'),{
                            change: ev =>
                                (f.requireMapshot = ev.target.checked),
                        }),
                        e('span require-mapshot')
                    ),
                    e('label',
                        a(e('input type=checkbox'), {
                            change: ev =>
                                (f.requireDescription = ev.target.checked),
                        }),
                        e('span require-description')
                    ),
                    e('label',
                        a(e('input type=checkbox'), {
                            change: ev =>
                                (f.requireWaypoint = ev.target.checked),
                        }),
                        e('span require-waypoint')
                    )
                ),
            )
        );
    }
    async load() {
        const worker = this.worker = new Worker('worker.js');
        let meta;
        this.post('loadmap', Config.load);
        worker.addEventListener('message', ev => {
            let { type, data } = ev.data;
            switch (type) {
            case 'meta':
                this.meta = meta = data;
                this.initMenu();
                this.initFilter();
                break;
            case 'amount':
                if (data === 0) {
                    for (let e of this.itemPool)
                        e.element.remove();
                    this.#pageStat.innerText = i18n('no-data');
                }
                this.amount = data;
                break;
            case 'loadstat':
                this.meter(data / meta.amount);
                if (data > this.mapsPerPage)
                    this.get(0);
                break;
            case 'meter':
                this.meter(data);
                break;
            case 'data':
                this.show(data);
                break;
            case 'error':
                Dialog.alert(data.toString(), null, true);
                throw data;
            case 'ready':
                this.meter(1);
                this.get(0);
                break;
            }
        });
    }
    post(type, data) {
        this.worker.postMessage({ type, data });
    }
    /**
     * @param {number} at
     */
    get(at) {
        if (at < 0) at = 0;
        else if (at > this.meta.amount) return;
        this.post('get', {
            at: at, amount: this.mapsPerPage
        });
        this.index = at;
    }
    /** @param {MapData[]} data_list */
    async show(data_list) {
        // if (at === this.index) return;
        if (data_list.length === 0) return;
        const meta = this.meta;
        let fragment = new DocumentFragment();
        let count = 0, map_count = 0;
        while (map_count < data_list.length) {
            /** @type {MapData} */
            let data = data_list[map_count];
            if (data === undefined) break;
            for (const name in data.bsp) {
                let item;
                if (this.itemPool.length <= count) {
                    item = new Item();
                    this.itemPool.push(item);
                } else {
                    item = this.itemPool[count];
                }
                let bsp = data.bsp[name];
                let gametypes = [];
                let entities = {};
                let links = {};
                item.data = data;
                item.pk3 = data.pk3;
                item.date = new Date(data.date * 1e3);
                item.filesize = data.filesize;
                item.mapshot = bsp.mapshot;
                item.author = bsp.author; // || i18n('unknown');
                item.title = bsp.title;
                item.description = bsp.description;
                if (typeof bsp.gametypes === 'object') // original json
                    gametypes = bsp.gametypes;
                else for (const type in meta.gametype) // uint32 mask
                    if (bsp.gametypes & meta.gametype[type])
                        gametypes.push(type);
                item.setGametypes(gametypes);
                if (!(bsp.entities instanceof Array)) // original json
                    entities = bsp.entities;
                else for (const n in meta.entity) // array
                    entities[meta.entity[n]] = bsp.entities[n];
                item.setEntities(entities);
                // TODO links
                item.setLinks(links);
                fragment.appendChild(item.element);
                // this.meter(count / this.minPoolCount);
                count++;
            }
            map_count++;
        }
        this.view.appendChild(fragment);
        this.#pageStat.innerText = i18n('showing-maps-0-to-1-of-total-2', [
            this.index + 1,
            this.index + map_count,
            this.amount,
        ]);
        for (; count < this.itemPool.length; count++) {
            this.itemPool[count].element.remove();
        }
    }
    meter(rate) {
        this.#meter.style.width = rate * 100 + '%';
        this.#meter.dataset.full = rate === 1 ? '1' : '0';
    }
    filter() {
        if (!this.meta) return;
        Dialog.alert('#filter', () => this.post('filter', this.filterHowto));
    }
    random() {
        this.post('filter', { key: 'random' });
    }
}

class Main {
    promise;
    maps;
    constructor() {
        this.promise = new Promise(async (resolve) => {
            Config = await fetch('config.json').then(r => r.json());
            let lang = navigator.language;
            await fetch(`lang/${lang}.json`).then(r => r.json()).then(data => {
                i18n.useLanguage(lang);
                i18n.add(lang, data);
            }).catch(() => void 0);
            // @ts-ignore
            document.querySelector('header>h1').innerText = i18n('xonotic-map-repo');
            this.maps = new Maps();
            resolve();
        });
    }
}

var main = new Main();
