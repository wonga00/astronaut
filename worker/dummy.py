from datetime import datetime

#a dummy python script


f = open('out.txt','w')
data = str(datetime.today())
f.write(data)
print data
f.close()

