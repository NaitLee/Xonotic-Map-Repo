#!/bin/sh
if [[ $1 == '1' ]]; then
    go build -ldflags="-s -w"
    GOOS=windows GOARCH=amd64 go build -ldflags="-s -w"
else
    go build
    # if [[ $1 == '0' ]]; then ./xonotic-map-repo; fi
fi
