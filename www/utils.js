
/**
 * Create an HTML element
 * @param {string} data Something like `a .class #id href=/page.html my-page`
 * @param  {...HTMLElement} children Other elements to append as children
 * @returns {HTMLElement}
 */
function e(data, ...children) {
    let element = null;
    for (let item of data.split(' ')) {
        if (element === null) { element = document.createElement(item || 'div'); continue; }
        if (item[0] === '.') element.classList.add(item.slice(1));
        else if (item[0] === '#') element.id = item.slice(1);
        else if (item.indexOf('=') !== -1)
            // @ts-ignore
            element.setAttribute(...item.replace(/\+/g, ' ').split('=', 2));
        else element.innerText = typeof i18n === 'undefined' ? item : i18n(item);
    }
    for (const e of children)
        element.appendChild(e);
    return element;
}
/**
 * Put text to HTML element
 * @param {HTMLElement} element 
 * @param {string} text will be passed to i18n, if available
 * @param {any[]} [things] will be passed to i18n, if available
 * @returns {HTMLElement}
 */
function t(element, text, things) {
    element.innerText = typeof i18n === 'undefined' ? text : i18n(text, things);
    return element;
}
/**
 * Attach events to HTML element
 * @param {HTMLElement} element
 * @param {Record<string, (ev: any) => any>} events Key can be comma-separated events
 * @param {any} thisArg
 * @returns 
 */
function a(element, events, thisArg) {
    for (const alltype in events)
        for (const type of alltype.split(','))
            element.addEventListener(type, events[alltype].bind(thisArg || element));
    return element;
}

const Dialog = (function() {
    let dialog, dialog_content, dialog_choices, dialog_input;
    dialog = e(' #dialog .hidden',
        dialog_content = e(' .content'),
        e(' .choices',
            dialog_input = e('input type=text'),
            dialog_choices = e('p')
        )
    )
    const hidden_area = document.getElementById('hidden');
    document.body.appendChild(dialog);
    let last_choices;
    function clean_up() {
        if (last_choices)
            for (let choice of last_choices)
                choice.remove();
        // elements
        for (let element of dialog_content.children)
            hidden_area.appendChild(element);
        // text nodes
        for (let node of dialog_content.childNodes)
            node.remove();
    }
    function show(argument, as_string = false) {
        dialog.classList.remove('hidden');
        if (as_string)
            dialog_content.innerText = argument;
        else
            dialog_content.appendChild(document.querySelector(argument));
    }
    function apply_callback(callback, have_input = false, ... choices) {
        last_choices = [];
        dialog_input.value = '';
        dialog_input.style.display = have_input ? 'unset' : 'none';
        const keys = 'nm,.';
        let index = 0;
        for (let choice of choices) {
            let button = document.createElement('button');
            button.dataset.i18n = choice;
            button.dataset.key = keys[index++];
            button.innerText = i18n(choice);
            if (!have_input)
                button.addEventListener('click', () => dialog_input.value = choice);
            dialog_choices.appendChild(button);
            last_choices.push(button);
        }
        return new Promise(resolve => {
            last_choices[0].addEventListener('click', () => {
                dialog.classList.add('hidden');
                if (callback) resolve(callback(dialog_input.value));
            });
            if (last_choices.length > 1)
                last_choices[1].addEventListener('click', () => {
                    dialog.classList.add('hidden');
                    if (callback) resolve(callback(null));
                });
        });
    }
    return {
        alert: function(selector, callback, as_string = false) {
            clean_up();
            let promise = apply_callback(callback, false, 'ok');
            show(selector, as_string);
            return promise;
        },
        confirm: function(selector, callback, as_string = false) {
            clean_up();
            let promise = apply_callback(callback, false, 'yes', 'no');
            show(selector, as_string);
            return promise;
        },
        prompt: function(selector, callback, as_string = false) {
            clean_up();
            let promise = apply_callback(callback, true, 'ok', 'cancel');
            show(selector, as_string);
            return promise;
        }
    }
})();
