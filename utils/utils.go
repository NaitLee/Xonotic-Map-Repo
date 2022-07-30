package utils

import "log"

func FailIf(err error) {
	if err != nil {
		log.Panicln(err)
	}
}

func AnyString(s1 string, ss ...string) bool {
	for _, s := range ss {
		if s1 == s {
			return true
		}
	}
	return false
}
