build :
	mkdir -p app
	cp ../../../package.json app
	cp ../../../wo.js app
	docker build -t wo-shared:1 .

clean :
	rm *~

.PHONY : build clean

