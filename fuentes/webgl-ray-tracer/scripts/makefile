.SUFFIXES:
.PHONY: all

dir_src_ts  := ../src-ts
dir_js      := ../public_html/js
opciones    := -strict -noEmitOnError -target ES2022 --outDir $(dir_js) 
archs_ts    := $(wildcard $(dir_src_ts)/*.ts)
archs_js    := $(addprefix $(dir_js)/, $(addsuffix .js, $(basename $(notdir $(archs_ts)))))

all: $(archs_js) makefile
	
$(dir_js)/%.js : $(dir_src_ts)/%.ts 
	tsc $(opciones) $< 

clean:
	cd $(dir_js) ; rm -rf *.js