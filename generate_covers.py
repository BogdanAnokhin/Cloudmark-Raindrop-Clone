from pathlib import Path
from html import escape
import math, random
out=Path(__file__).resolve().parent/'public'/'assets'
out.mkdir(parents=True,exist_ok=True)
def svg(name,bg1,bg2,text,subtitle='',fg='#ffffff',art='circles'):
    random.seed(name)
    body=''
    if art=='circles':
        body=''.join(f'<circle cx="{random.randint(-50,550)}" cy="{random.randint(-40,320)}" r="{random.randint(27,95)}" fill="none" stroke="{fg}" stroke-opacity=".23" stroke-width="{random.randint(2,25)}"/>' for _ in range(8))
    elif art=='checker':
        body=''.join(f'<rect x="{x}" y="{y}" width="53" height="53" rx="11" fill="{fg}" opacity="{round(random.uniform(.05,.20),2)}" transform="rotate({random.randint(-25,25)} {x+25} {y+25})"/>' for x in range(20,500,80) for y in range(-20,300,80))
    elif art=='mountains':
        body=f'<circle cx="397" cy="65" r="46" fill="#fff2bd" opacity=".85"/><path d="M0 225 120 91l104 139 98-113 178 134V280H0Z" fill="#f6f9fd" opacity=".52"/><path d="M0 280 157 143l165 137 73-98 105 90v8Z" fill="#203e5e" opacity=".35"/>'
    elif art=='windows':
        body='<rect x="198" y="20" width="275" height="225" rx="16" fill="#fff" fill-opacity=".88"/><rect x="198" y="20" width="275" height="30" rx="14" fill="#192840" fill-opacity=".12"/><circle cx="216" cy="35" r="4" fill="#f36a78"/><circle cx="230" cy="35" r="4" fill="#fac978"/><circle cx="244" cy="35" r="4" fill="#6dd5ab"/>'
        for i,w in enumerate([195,151,170,112,188]): body+=f'<rect x="{217 if i%2==0 else 230}" y="{71+i*31}" width="{w}" height="9" rx="4" fill="{["#5b94fa","#ab8aea","#66cdbd","#8b9bb3","#ef8c93"][i]}" opacity=".65"/>'
    elif art=='diamond':
        body='<path d="M362 -70 540 105 365 280 185 105Z" fill="#fff" opacity=".11"/><path d="M428 21 500 93 428 165 356 93Z" fill="#fff" opacity=".22"/><path d="M315 130 415 230 315 330 215 230Z" fill="#fff" opacity=".13"/>'
    elif art=='typography':
        body='<text x="235" y="230" font-size="230" font-weight="900" opacity=".15" fill="#fff" font-family="Georgia,serif">Aa</text><path d="M270 34V255M290 34V255" stroke="#fff" opacity=".15"/>'
    elif art=='map':
        body=''.join(f'<path d="M{random.randint(210,400)} 0q{random.randint(-80,80)} 100 {random.randint(-25,60)} 280" stroke="{fg}" stroke-opacity=".3" stroke-width="{random.randint(8,25)}" fill="none"/>' for _ in range(5))+'<circle cx="389" cy="91" r="22" fill="#ffeb9c"/><path d="m389 69 0 36" stroke="#fff" stroke-width="6"/>'
    elif art=='logo':
        body='<circle cx="367" cy="130" r="93" fill="#ffffff" opacity=".18"/><circle cx="367" cy="130" r="66" fill="#ffffff" opacity=".18"/><path d="m324 127 30 31 60-67" stroke="white" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    if art!='windows':
        body+=f'<text x="34" y="242" fill="{fg}" fill-opacity=".55" font-family="Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="3">COLLECT GOOD THINGS  ·  CLOUDMARK</text>'
    lines=text.split('|')
    label=''.join(f'<text x="34" y="{98+i*50}" font-family="Arial, Helvetica, sans-serif" font-size="{42 if len(line)<12 else 31}" letter-spacing="-1" font-weight="800" fill="{fg}">{escape(line)}</text>' for i,line in enumerate(lines))
    if subtitle: label+=f'<text x="35" y="{106+len(lines)*50}" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="600" fill="{fg}" opacity=".75">{escape(subtitle)}</text>'
    data=f'''<svg xmlns="http://www.w3.org/2000/svg" width="500" height="280" viewBox="0 0 500 280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient></defs><rect width="500" height="280" fill="url(#g)"/>{body}<rect width="500" height="280" fill="url(#fade)" opacity="0"/>{label}</svg>'''
    (out/f'{name}.svg').write_text(data)

specs=[
('awwwards','#252b69','#a960b7','Awwwards','Best in digital','white','diamond'),
('dribbble','#ed7a99','#f9b49e','dribbble','Discover creative work','white','circles'),
('figma','#281e49','#7249b8','Figma.','Design together','#ffffff','checker'),
('behance','#1250bd','#5c91ee','Bēhance','The creative network','#ffffff','diamond'),
('typewolf','#d5cbb9','#a59e8b','Type|wolf','Typography inspiration','#2b2a28','typography'),
('mdn','#171f36','#343f69','MDN','Web Docs','#ffffff','windows'),
('vue','#237563','#50b499','Vue.js','The Progressive Framework','#ffffff','logo'),
('github','#121824','#39465e','GitHub','Build software','#ffffff','windows'),
('roadmap','#7143ce','#ca84c4','roadmap.sh','Learn to code','#ffffff','map'),
('tailwind','#076c9c','#3ec7cc','tailwindcss','Utility-first CSS','#ffffff','circles'),
('smashing','#f44348','#f08b65','Smashing','Magazine','#ffffff','diamond'),
('nng','#ad906c','#e1c9a0','UX RESEARCH','Nielsen Norman Group','#292d39','checker'),
('unsplash','#34595d','#90bead','UNSPLASH','Beautiful free images','#ffffff','mountains'),
('pexels','#233f6e','#628db4','Pexels','The best free photos','#ffffff','mountains'),
('atlas','#b55563','#ef9a6a','ATLAS|OBSCURA','Hidden places','#ffffff','map'),
('wiki','#c3c8ce','#e9e9e9','WIKIPEDIA','The free encyclopedia','#2f3d51','typography')]
for args in specs:svg(*args)
(out/'favicon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g"><stop stop-color="#10b2ff"/><stop offset="1" stop-color="#3270ef"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#g)"/><path d="M17 42c-7-3-5-16 5-17 3-12 22-12 25 1 10 2 10 16 0 18H22c-2 0-4-1-5-2Z" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>''')
print('Created:',len(list(out.glob('*.svg'))),'SVG assets')
