"""Render the exported estate scene (scene.glb) with Blender Cycles (path tracing).
Usage: python3 cycles.py <view> <width> <height> <samples>"""
import json, math, sys, time
import bpy
from mathutils import Vector

HERE = '/tmp/claude-0/-home-claude/73527c4d-2b51-552b-a533-2a604c693f31/scratchpad/real/'
view, W, H, SPP = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
cams = json.load(open(HERE + 'cams.json'))
cv = lambda p: Vector((p[0], -p[2], p[1]))  # glTF Y-up -> Blender Z-up

bpy.ops.wm.read_factory_settings(use_empty=True)
import addon_utils; addon_utils.enable('cycles', default_set=True)
bpy.ops.import_scene.gltf(filepath=HERE + 'scene.glb')

def principled(m):
    return next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)

for m in bpy.data.materials:
    if not m.use_nodes: continue
    nt = m.node_tree; nodes, links = nt.nodes, nt.links; bsdf = principled(m)
    if not bsdf: continue
    name = m.name.lower()
    # base colour = texture x vertex colour (the engine tints shared textures per house)
    img = next((n for n in nodes if n.type == 'TEX_IMAGE'), None)
    vc = nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Color'
    mix = nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
    if img: links.new(img.outputs['Color'], mix.inputs[6])
    else: mix.inputs[6].default_value = bsdf.inputs['Base Color'].default_value[:]
    links.new(vc.outputs['Color'], mix.inputs[7])
    links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    # physically based tweaks per surface
    def bump(strength, scale):
        nz = nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8
        bp = nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = strength
        links.new(nz.outputs['Fac'], bp.inputs['Height']); links.new(bp.outputs['Normal'], bsdf.inputs['Normal'])
    if name.startswith('glass'):
        bsdf.inputs['Roughness'].default_value = .03; bsdf.inputs['Metallic'].default_value = 0; bsdf.inputs['IOR'].default_value = 1.52
        bsdf.inputs['Specular IOR Level'].default_value = 1.0; bsdf.inputs['Coat Weight'].default_value = 1.0
    elif name.startswith('water'):
        bsdf.inputs['Transmission Weight'].default_value = .85; bsdf.inputs['IOR'].default_value = 1.33; bsdf.inputs['Roughness'].default_value = .02
    elif name.startswith(('lawn', 'grass', 'park', 'veld')):
        bsdf.inputs['Roughness'].default_value = .95; bump(.6, 180)
    elif name.startswith(('plaster', 'precast')):
        bsdf.inputs['Roughness'].default_value = .88; bump(.15, 90)
    elif name.startswith(('stone', 'brick')):
        bsdf.inputs['Roughness'].default_value = .9; bump(.4, 60)
    elif name.startswith('tar'):
        bsdf.inputs['Roughness'].default_value = .8; bump(.25, 250)
    elif name.startswith('roof'):
        bsdf.inputs['Roughness'].default_value = .55
    elif name.startswith('metal'):
        bsdf.inputs['Metallic'].default_value = .8; bsdf.inputs['Roughness'].default_value = .28
    elif name.startswith(('leaves', 'leaf')):
        bsdf.inputs['Roughness'].default_value = .6; bsdf.inputs['Subsurface Weight'].default_value = .15; bump(.5, 25)

# smooth shading on tree crowns
for o in bpy.data.objects:
    if o.type == 'MESH' and any(ms.material and ms.material.name.lower().startswith('leaves') for ms in o.material_slots):
        for p in o.data.polygons: p.use_smooth = True

sc = bpy.context.scene
# sky: physically based atmosphere for ambient light + a sun lamp for crisp shadows
world = bpy.data.worlds.new('World'); sc.world = world; world.use_nodes = True
wn = world.node_tree.nodes; wl = world.node_tree.links; bg = wn['Background']
sky = wn.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'; sky.sun_disc = False
sd = cams[view]['sun']; sun_dir = cv(sd).normalized()
sky.sun_elevation = math.asin(max(.05, sun_dir.z)); sky.sun_rotation = math.atan2(sun_dir.x, sun_dir.y); sky.air_density = 1.2; sky.dust_density = 1.5
wl.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = .35
sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = 5.5; sun.angle = math.radians(1.2); sun.color = (1, .95, .88)
so = bpy.data.objects.new('Sun', sun); sc.collection.objects.link(so); so.rotation_euler = (-sun_dir).to_track_quat('-Z', 'Y').to_euler()

cam = bpy.data.cameras.new('Cam'); cam.sensor_fit = 'VERTICAL'; cam.angle_y = math.radians(cams[view]['fov']); cam.clip_end = 3000
co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
p, t = cv(cams[view]['p']), cv(cams[view]['t']); co.location = p; co.rotation_euler = (t - p).to_track_quat('-Z', 'Y').to_euler()

sc.render.engine = 'CYCLES'; cy = sc.cycles; cy.device = 'CPU'; cy.samples = SPP; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .03
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 5; cy.diffuse_bounces = 3; cy.glossy_bounces = 3; cy.transmission_bounces = 4
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = -.1
sc.render.filepath = HERE + f'cycles_{view}.png'; sc.render.image_settings.file_format = 'PNG'
t0 = time.time(); bpy.ops.render.render(write_still=True); print('rendered', view, round(time.time() - t0), 's')
