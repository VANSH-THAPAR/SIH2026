import os

path = 'src/services/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("await api.get<PatternCluster[]>('/patterns');", "await api.get<any>('/patterns');")
content = content.replace("return res.data;", "return res.data.patterns || res.data;")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
