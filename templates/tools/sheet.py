#!/usr/bin/env python3
"""Ghép các still trong out/stills thành contact sheet (3 cột × 4 hàng) để rà soát."""
import glob, os, subprocess, sys
d=os.path.join(os.path.dirname(__file__),'..','out')
files=sorted(glob.glob(os.path.join(d,'stills','f_*.png')))
os.makedirs(os.path.join(d,'sheets'),exist_ok=True)
for g in range(0,len(files),12):
    grp=files[g:g+12]; n=len(grp)
    ins=[x for f in grp for x in ('-i',f)]
    fc=''.join(f'[{i}:v]scale=640:-1[s{i}];' for i in range(n))+''.join(f'[s{i}]' for i in range(n))
    fc+=f'xstack=inputs={n}:layout='+'|'.join(f'{(k%3)*640}_{(k//3)*360}' for k in range(n))
    out=os.path.join(d,'sheets',f'sheet_{g//12:02d}.png')
    subprocess.run(['ffmpeg','-y','-loglevel','error',*ins,'-filter_complex',fc,'-frames:v','1',out],check=True)
    print(out,[os.path.basename(f)[2:-4] for f in grp])
