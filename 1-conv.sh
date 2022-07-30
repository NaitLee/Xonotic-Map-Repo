#!/bin/sh
if [[ "x$1" == "x" ]]; then set maps.json; fi
if [[ $2 == '0' ]]; then ./0-build.sh; fi
./xonotic-map-repo conv $1 && mv maps-meta.json maps-data1.bin maps-data2.bin www/
