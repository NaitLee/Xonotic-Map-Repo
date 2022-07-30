package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"xonotic-map-repo/conv"
	"xonotic-map-repo/serve"
	"xonotic-map-repo/utils"
)

var FailIf = utils.FailIf
var AnyString = utils.AnyString

func usage() {
	name := filepath.Base(os.Args[0])
	fmt.Printf("Usage:\n  %s conv [maps.json]\n  %s serve [port]\n", name, name)
	os.Exit(0)
}

func main() {
	argv := os.Args
	argc := len(argv)
	var (
		command string
		path    string
		port    int
		err     error
	)
	if argc == 1 {
		usage()
	}
	if command = argv[1]; !AnyString(command, "conv", "serve") {
		usage()
	}
	if argc == 2 {
		switch command {
		case "conv":
			path = "maps.json"
		case "serve":
			port = 8080
		}
	} else {
		switch command {
		case "conv":
			path = argv[2]
		case "serve":
			port, err = strconv.Atoi(argv[2])
			FailIf(err)
		}
	}
	switch command {
	case "conv":
		conv.Conv(path)
	case "serve":
		serve.Serve(port)
	}
}
