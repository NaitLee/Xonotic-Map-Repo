package conv

import (
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"os"
	"strings"
	"xonotic-map-repo/utils"
)

const INCLUDE_SHASUM = false

var FailIf = utils.FailIf

var DataKeys = map[string]uint8{
	"pk3":      1,
	"shasum":   2,
	"filesize": 3,
	"date":     4,
	"bsp":      5,
}
var BspKeys = map[string]uint8{
	"name":        1,
	"mapshot":     2,
	"mapinfo":     3,
	"waypoints":   4,
	"map":         5,
	"radar":       6,
	"title":       7,
	"description": 8,
	"author":      9,
	"license":     10,
	"gametypes":   11,
	"entities":    12,
}
var DatatypeKeys = map[string]uint8{
	"string":   1,
	"shasum":   2,
	"entities": 3,
}

// added on the fly
var GametypesMask = map[string]uint32{}

// added on the fly
var Entities = map[string]uint8{}

var nullByte = []byte{0}

func Conv(path string) {
	mapsjson, err := os.Open(path)
	defer mapsjson.Close()
	FailIf(err)
	data1, err := os.Create("maps-data1.bin")
	defer data1.Close()
	FailIf(err)
	data1.Write(nullByte)
	data2, err := os.Create("maps-data2.bin")
	defer data2.Close()
	FailIf(err)
	data2.Write(nullByte)
	if !INCLUDE_SHASUM {
		delete(DataKeys, "shasum")
	}
	// write to a file, return the position before the write
	write := func(w *os.File, data ...any) uint32 {
		position, err := w.Seek(0, 1)
		FailIf(err)
		if position > math.MaxUint32 {
			log.Fatalln("Not Implemented: More than 4 GiB data wrote to maps-data file.")
		}
		for _, v := range data {
			err = binary.Write(w, binary.LittleEndian, v)
			FailIf(err)
		}
		return uint32(position)
	}
	var cachedStrings = map[string]uint32{}
	cacheString := func(s string) uint32 {
		position, ok := cachedStrings[s]
		if !ok {
			position = write(data2, DatatypeKeys["string"], uint16(len(s)))
			d := []byte(s)
			if len(d) > math.MaxUint16 {
				fmt.Printf("Warning: string '%s...' have more than %d bytes, truncating\n", s[0:16], math.MaxUint16)
				d = d[0:math.MaxUint16]
			}
			data2.Write(d)
			cachedStrings[s] = position
		}
		return position
	}
	var (
		amount         uint32 = 0
		gametypeCount  uint8  = 0
		entityKeyCount uint8  = 0
	)
	decoder := json.NewDecoder(mapsjson)
	// go toward "data" array
	decoder.Token()
	decoder.Token()
	decoder.Token()
	for decoder.More() {
		var item any
		if err = decoder.Decode(&item); err == io.EOF {
			break
		} else if err != nil {
			FailIf(err)
		}
		if item1, ok := item.(map[string]interface{}); ok {
			for key1, value1 := range item1 {
				mark1, ok := DataKeys[key1]
				if !ok {
					// fmt.Printf("Note: '%s' isn't in DataKeys\n", key1)
					continue
				}
			switch_t1:
				switch t1 := value1.(type) {
				case float64:
					write(data1, mark1, uint32(t1))
				case string:
					if t1 == "" {
						break switch_t1
					}
					var position uint32
					if key1 == "shasum" {
						b, err := hex.DecodeString(t1)
						if err != nil || len(b) != 20 {
							log.Fatalf("Isn't a SHA1 checksum: %s", t1)
						}
						position = write(data2, DatatypeKeys["shasum"], uint16(20), b)
					} else if key1 == "pk3" {
						if s := strings.TrimSuffix(t1, ".pk3"); s != t1 {
							position = cacheString(s)
						} else {
							fmt.Printf("Note: got a special '%s' path, '%s'\n", key1, t1)
						}
					} else {
						position = cacheString(t1)
					}
					write(data1, mark1, position)
				case map[string]interface{}:
					// bsp
					write(data1, mark1)
					for bspName, value2 := range t1 {
						write(data1, BspKeys["name"], cacheString(bspName))
						switch t2 := value2.(type) {
						case map[string]interface{}:
							for key3, value3 := range t2 {
								mark3, ok := BspKeys[key3]
								if !ok {
									fmt.Printf("'%s' isn't in BspKeys\n", key1)
									continue
								}
							switch_t3:
								switch t3 := value3.(type) {
								case float64:
									write(data1, mark3, uint32(t3))
								case bool:
									if t3 {
										write(data1, mark3)
									}
								case string:
									if t3 == "" {
										break switch_t3
									}
									switch key3 {
									case "map", "mapshot", "mapinfo", "waypoints", "radar":
										var path string
										if key3 == "radar" {
											path = "gfx/"
										} else {
											path = "maps/"
										}
										if suffix := strings.TrimPrefix(t3, path+bspName); suffix != t3 {
											if suffix == ".tga" {
												suffix = ".jpg"
											}
											write(data1, mark3, cacheString(suffix))
											break switch_t3
										}
										fmt.Printf("Note: got a special '%s' path, '%s' - '%s'\n", key3, bspName, t3)
									}
									position := cacheString(t3)
									write(data1, mark3, position)
								case []interface{}:
									// gametypes
									if len(t3) > 32 {
										log.Fatalln("Failed: More than 32 gametypeCount")
									}
									var mask uint32
									for _, t4 := range t3 {
										switch s := t4.(type) {
										case string:
											m, ok := GametypesMask[s]
											if !ok {
												GametypesMask[s] = 1 << gametypeCount
												m = 1 << gametypeCount
												gametypeCount += 1
											}
											mask |= m
											write(data1, mark3, mask)
										}
									}
								case map[string]interface{}:
									// entities
									if len(t3) >= math.MaxUint8 {
										log.Fatalf("Failed: More than %d entityKeyCount", math.MaxUint8-1)
									}
									position := write(data2, DatatypeKeys["entities"], uint16(len(t3)*(1+2)))
									for key4, value4 := range t3 {
										switch t4 := value4.(type) {
										case float64:
											if t4 > math.MaxUint16 {
												fmt.Printf("Note: '%s' have %d '%s', assuming %d\n", bspName, int(t4), key4, math.MaxUint16)
											}
											e, ok := Entities[key4]
											if !ok {
												entityKeyCount += 1
												Entities[key4] = entityKeyCount
												e = entityKeyCount
											}
											write(data2, e, uint16(t4))
										}
									}
									write(data1, mark3, position)
								}
							}
						}
					}
					write(data1, nullByte)
				}
			}
			write(data1, nullByte)
			amount += 1
		}
	}
	data1size, err := data1.Seek(0, 1)
	FailIf(err)
	data2size, err := data2.Seek(0, 1)
	FailIf(err)
	meta, err := os.Create("maps-meta.json")
	defer meta.Close()
	FailIf(err)
	metajson := json.NewEncoder(meta)
	metajson.SetIndent("", "  ")
	metajson.Encode(map[string]interface{}{
		"amount":    amount,
		"data1size": data1size,
		"data2size": data2size,
		"datakeys":  DataKeys,
		"bspkeys":   BspKeys,
		"gametype":  GametypesMask,
		"datatype":  DatatypeKeys,
		"entity":    Entities,
	})
	// fmt.Println(count)
}
