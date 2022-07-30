package serve

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

var MimeTypes = map[string]string{
	".html": "text/html, charset=utf-8",
	".css":  "text/css, charset=utf-8",
	".js":   "application/javascript, charset=utf-8",
}

type MyServer struct {
	webroot string
}

func (s MyServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p := strings.TrimLeft(r.URL.Path, "/")
	if p == "" {
		p = "index.html"
	} else if strings.Contains(p, "..") {
		return
	}
	p = filepath.Join(s.webroot, filepath.Clean(p))
	if strings.HasPrefix(p, "/") {
		return
	}
	mime, ok := MimeTypes[filepath.Ext(p)]
	if ok {
		w.Header().Set("Content-Type", mime)
	}
	file, err := os.Open(p)
	if err != nil {
		w.WriteHeader(404)
		w.Write([]byte("not found"))
		return
	}
	buffer := make([]byte, 16*1024)
	var length int
	for {
		length, err = file.Read(buffer)
		switch err {
		case nil:
			break
		case io.EOF:
			return
		default:
			w.WriteHeader(500)
			w.Write([]byte(fmt.Sprintln(err)))
			return
		}
		w.Write(buffer[0:length])
	}
}

func Serve(port int) {
	server := MyServer{
		"www",
	}
	address := fmt.Sprintf("127.0.0.1:%d", port)
	fmt.Printf("Serving at http://%s\n", address)
	err := http.ListenAndServe(address, server)
	switch err {
	default:
		log.Println(err)
	}
}
