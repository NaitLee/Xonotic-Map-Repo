
///<reference path="./types.d.ts" />
///<reference path="./utils.js" />

'use strict';

/** @type {Config} */
let Config;

/** @type {any} */
// deno-lint-ignore no-var
var i18n;
if (i18n === undefined) i18n = (s, t) => s + ',' + t.join(',');

const hiddenArea = document.getElementById('hidden');

const LazyImage = (function() {
    const observing = new Set();
    const observer = new IntersectionObserver(entries => {
        for (const entry of entries)
            if (entry.isIntersecting) {
                /** @type {any} */
                const img = entry.target;
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
            const type = types[i];
            const type_i18n = i18n(type);
            const classname = 'icon-gametype_' + type;
            children.length > i
                ? (children[i].className = classname, children[i].title = type_i18n)
                : this.#gametypes.appendChild(e('i .' + classname + ' title=' + type_i18n.replace(/ /g, '+')));
        }
        for (let i = types.length; i < children.length; i++) {
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
        for (const key in entities) {
            if (entities[key] === 0 || Config.entity_blacklist.includes(key)) continue;
            const key_i18n = i18n(key);
            const classname = 'icon-' + key;
            children.length > count
                ? (children[count].className = classname, children[count].title = key_i18n, children[count].innerText = entities[key])
                : this.#entities.appendChild(t(e('i .' + classname + ' title=' + key_i18n.replace(/ /g, '+')), entities[key]));
            count += 1;
        }
        for (let i = count; i < children.length; i++) {
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
        const count = 0;
        for (const key in links) {
            children.length > count
                ? (children[count].href = links[key], children[count].innerText = key)
                : this.#links.appendChild(t(e('a href=' + links[key]), key));
        }
        for (let i = count; i < children.length; i++) {
            children[i].innerText = children[i].href = '';
        }
        this._links = links;
    }
    constructor() {
        const activate = () => el.classList.toggle('active');
        const el = this.element = e(' .item',
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

class Main {
    /** @type {MapsMeta} */
    meta;
    /** @type {number} */
    index;
    /** @type {Item[]} */
    itemPool;
    // No "odd" lines in layout with 2, 3, 4, 5, or 6 items in one row
    mapsPerPage = 3 * 4 * 5;
    /** @type {HTMLElement} */
    #pageStat;
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
        this.load().then(() => {
            const url = new URL(location.href);
            const hash = decodeURIComponent(location.hash.slice(1));
            if (url.search === '' && hash === '') return;
            try {
                const json = hash || url.searchParams.get('filter');
                Object.assign(this.filterHowto, JSON.parse(json));
                this.filter();
            } catch (_) { /** bad json, don't care */ }
        });
    }
    initMenu() {
        document.querySelector('header>h1').innerText = document.querySelector('title').innerText = i18n('xonotic-map-repo');
        const share_link_e = e('pre');
        hiddenArea.appendChild(e('p #share-link', e('span copy-and-share-this-link'), share_link_e));
        document.querySelector('header').appendChild(e(' #menu',
            a(t(e('button #share-button .hidden'), 'share-search-result'), {
                'click': () => {
                    share_link_e.innerText = decodeURIComponent(location.href);
                    Dialog.alert('#share-link');
                }
            }),
            a(t(e('button'), 'search-sort-filter'), {
                'click': () => Dialog.alert('#filter', this.filter.bind(this), false, 'apply')
            }, this),
            a(t(e('button'), 'random-pick'), {
                'click': this.random
            }, this),
            a(t(e('button'), 'toggle-view'), {
                'click': () => this.view.classList.toggle('active')
            })
        ));
        document.body.appendChild(e('p .pages',
            a(t(e('button .icon-previous'), 'previous'), {
                'click': () => (this.get(this.index - this.mapsPerPage), window.scrollTo(0, 0))
            }, this),
            this.#pageStat = t(e('span .pagestat'), 'loading'),
            a(t(e('button .icon-next'), 'next'), {
                'click': () => (this.get(this.index + this.mapsPerPage), window.scrollTo(0, 0))
            }, this),
            this.#meter = e(' .meter')
        ));
    }
    initFilter() {
        /** @type {FilterHowto} */
        const f = this.filterHowto = {
            // @ts-ignore: it will be fulfilled eventually
            key: 'name',
            withGametype: {}
        };
        hiddenArea.appendChild(
            e(' #filter .form',
                e('span sort-by-'),
                e('span',
                    a(e('select',
                        e('option value=name name'),
                        e('option value=size map-file-size'),
                        e('option value=date date')
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
                e('span file-size-'),
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
                            t(e('option value=2,0'), 'past-0-year', [2]),
                            t(e('option value=5,0'), 'past-0-year', [5]),
                            t(e('option value=10,0'), 'past-0-year', [10]),
                            t(e('option value=0,10'), 'older-than-0-year', [10])
                        ),
                        {
                            change: ev =>
                                ([f.timeAfter, f.timeBefore] = ev.target.value
                                    .split(',')
                                    .map(s => {
                                        const offset_year = parseInt(s);
                                        if (offset_year === 0) return 0;
                                        const now = new Date();
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
                                (f.withMapshot = ev.target.checked),
                        }),
                        e('span with-mapshot')
                    ),
                    e('label',
                        a(e('input type=checkbox'), {
                            change: ev =>
                                (f.withDescription = ev.target.checked),
                        }),
                        e('span with-description')
                    ),
                    e('label',
                        a(e('input type=checkbox'), {
                            change: ev =>
                                (f.withWaypoint = ev.target.checked),
                        }),
                        e('span with-waypoint')
                    )
                ),
            )
        );
    }
    async initI18n() {
        if (!i18n) return;
        const langs = navigator.languages.slice(0, 2).concat(['en-US']);
        i18n.useLanguage(langs[0]);
        for (const lang of langs)
            await fetch(`lang/${lang}.json`)
                .then(r => r.json())
                .then(data => i18n.add(lang, data))
                .catch(() => void 0);
    }
    async load() {
        let resolve;
        const promise = new Promise(r => resolve = r);
        Config = await fetch('config.json').then(r => r.json());
        const worker = this.worker = new Worker('worker.js');
        const promise_i18n = new Promise(resolve => { this.initI18n().then(() => resolve()) });
        let interface_ok = false;
        let meta;
        this.post('loadmap', Config.load);
        worker.addEventListener('message', ev => {
            const { type, data } = ev.data;
            if (type === 'meta') {
                this.meta = meta = data;
                promise_i18n.then(() => {
                    this.initMenu();
                    this.initFilter();
                    interface_ok = true;
                });
                return;
            }
            switch (type) {
            case 'amount':
                if (data === 0) {
                    for (const e of this.itemPool)
                        e.element.remove();
                    if (interface_ok)
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
                promise_i18n.then(_ => this.show(data));
                break;
            case 'error':
                Dialog.alert(data.toString(), null, true);
                throw data;
            case 'ready':
                this.meter(1);
                this.get(0);
                resolve();
                break;
            }
        });
        return promise;
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
    show(data_list) {
        // if (at === this.index) return;
        if (data_list.length === 0) return;
        const meta = this.meta;
        const fragment = new DocumentFragment();
        let count = 0, map_count = 0;
        while (map_count < data_list.length) {
            /** @type {MapData} */
            const data = data_list[map_count];
            if (data === undefined) break;
            for (const name in data.bsp) {
                let item;
                if (this.itemPool.length <= count) {
                    item = new Item();
                    this.itemPool.push(item);
                } else {
                    item = this.itemPool[count];
                }
                const bsp = data.bsp[name];
                const links = {};
                let gametypes = [];
                let entities = {};
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
        if (!this.#meter) return;
        this.#meter.style.width = rate * 100 + '%';
        this.#meter.dataset.full = rate === 1 ? '1' : '0';
    }
    filter() {
        if (!this.meta) return;
        this.post('filter', this.filterHowto);
        document.querySelector('#share-button').classList.remove('hidden');
        location.hash = JSON.stringify(this.filterHowto);
    }
    random() {
        this.post('filter', { key: 'random' });
    }
}

const _main = new Main();
