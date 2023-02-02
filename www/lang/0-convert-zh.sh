#!/bin/sh
# See also https://github.com/NaitLee/xon-cn-ext
sed 's/中文（傳統字）/中文（簡體字）/g' < zh-CN-hant.json | opencc -c opencc-zh-cn.json >zh-CN.json
sed 's/中文（傳統字）/中文（正體字）/g' < zh-CN-hant.json | opencc -c opencc-zh-tw.json >zh-TW.json
sed 's/中文（傳統字）/中文（香港字）/g' < zh-CN-hant.json | opencc -c opencc-zh-hk.json >zh-HK.json
