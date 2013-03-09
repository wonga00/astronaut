## ASTRONAUT.IO

A Feed of the Present 

See the site live [here](http://astronaut.io).

### About ###

The server currently pulls in videos daily from youtube. Search criteria is [TAG]XXXX with upload time this week, where TAG is a raw video prefix such as 'dsc' or 'img'. 
This search turns out to be a good approximation for the data set of home videos created in the last week.
example embeddable video ids:

    UzceMsuTrKI
    soFlKb07lWo

### Deployment

to push to nodester:
```
git push nodester master
```

to get logs:
```
nodester app logs astronaut
```

