gitclean:
	git rm --cached */__pycache__/*
tango_dev:
	python3 -m tango.test_context Power.CentralNode
build:
	docker build -t tenpointnine:0.0.1 .
