#!/bin/bash
# make sure to install supervisor first
# npm install supervisor

supervisor -e 'js|ejs|node|coffee' app.js
