
# Xonotic Map Repo

*A (much) better Web interface for the community [Xonotic Map Repository](https://github.com/z/xonotic-map-repository)*

## Intro

I'm playing [Xonotic](https://xonotic.org/) and I liked it. So that I want more maps.

Seeking around, I've found a community repo: [http://xonotic.fps.gratis](http://xonotic.fps.gratis). (Caution: the page loads a lot of data)

Great work! A large amount of maps are collected, but the browsing experience isn't satisfying. So let me follow it up.

## What's good about

In contrast to the Original frontend, this one have:

- Xonotic-like style/theme, cool
- Grid or Compact view, no more horizontal scrolling
- Load "streamingly", Search, Sort & Filter, all being quick
- Share a link of your filter configuration to let friends see

And technically more:

- No tons of "libraries" bloating the page
- Only load about 2.0 MiB compact binary data (for ~15,000 maps), no more 8.9 MiB json (though, it *can* be used)  
  Enabling HTTP gz/lzma compression will reduce it even more
- I18n support available, though needs community effort

Besides that, a Go program is available to convert the json data (used in Original frontend/backend) to binary format.

Please note that, for it's early, some potential inconsistency needs to be solved. See [notes](notes.txt) and [todo](todo.txt). **Expecting your feedback!**

## Get Started

The Easy route: well, wait for this to be hosted somewhere

The Dev's route:

0. Clone this repository, `cd` to it
1. Fetch the `maps.json` from Upstream: [http://xonotic.fps.gratis/maps.json](http://xonotic.fps.gratis/maps.json)  
  Put to this directory
2. With [Golang](https://go.dev/) installed, run `go build` in terminal
3. Run the built executable to convert json to binary format:  
  `./xonotic-map-repo conv maps.json`
4. You will get 3 files, `maps-meta.json`, `maps-data1.bin`, `maps-data2.bin`.  
  Move them to `www/`
5. Start a server with:
  `./xonotic-map-repo serve 8080`,  
  or use any static server you like, root at `www/`
6. Go to `http://127.0.0.1:8080` and enjoy  
  (Note that it will use the Upstream for Mapshots and Downloads. Configurable in `www/config.json`)

## License

Copyright © 2022 NaitLee Soft. Some rights reserved.

This project as a whole is licensed under MIT/Expat License, as in `LICENSE`.

For individual JavaScript files, see `www/jslicense.html`.

In `www/fonts/`, the Xolonium font is released under GPL-2-or-later with embedding exception, and the `icomoon.ttf` is from the [Original frontend repo](https://github.com/z/xonotic-map-repository-web/) without modification in MIT/Expat License.

## Thanks

- @z for his work on a community repository, and keep hosting it
- Every map makers & game contributors, and the awesome game
- The spirit of Software Freedom and Software Minimalism
