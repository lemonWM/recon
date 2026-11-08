# Cuts the recorded clip exactly to the scene and fixes its speed.
# The recorder writes 1080p video about 20% slower than real time. rec_zoom.py shows a small
# magenta square in the corner before and after the scene; this script finds it, cuts the
# scene out and restores the real speed.
import subprocess, sys, json, glob
import numpy as np
src = glob.glob('vid2/*.webm')[0]
meta = json.load(open('rec_zoom.out'))
# read the 16x16 bottom-left corner of every frame
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-vf', 'crop=16:16:0:in_h-16,fps=25', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 16, 16, 3).astype(int)
c = fr[:, 4:12, 4:12].mean(axis=(1, 2))
magenta = (c[:, 0] > 180) & (c[:, 1] < 90) & (c[:, 2] > 180)
idx = np.where(~magenta)[0]
# longest run of marker-free frames after the marker first appeared
first_m = np.where(magenta)[0][0]
free = [i for i in idx if i > first_m]
a, b = free[0], free[-1]
vid_len = (b - a + 1) / 25
wall = meta['end'] - meta['start']
print(json.dumps({'frames': len(fr), 'scene_from': a / 25, 'scene_to': b / 25, 'video_scene_s': round(vid_len, 2), 'wall_scene_s': round(wall, 2), 'stretch': round(vid_len / wall, 3)}))
speed = vid_len / wall
vf = 'setpts=PTS/%.5f' % speed if abs(speed - 1) > 0.03 else 'null'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '%.3f' % ((a + 1) / 25), '-t', '%.3f' % ((b - a - 1) / 25), '-i', src, '-vf', vf, '-r', '25', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-movflags', '+faststart', 'recon_multi_crm_test.mp4'], check=True)
