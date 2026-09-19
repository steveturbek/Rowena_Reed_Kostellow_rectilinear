# Rowena Reed Kostellow Exercise One: Rectilinear Volume

Interactive Web page demonstrating Exercise One: Rectilinear Volumes from Rowena Reed Kostellow's book "Elements of Design" [Elements of design : Rowena Reed Kostellow and the structure of visual relationships](https://archive.org/details/elementsofdesign0000hann/page/48/mode/2up) by Hannah, Gail Greet

## Approach

Weekend workshop project to make a Web based 3D modeling toy to help students quickly explore the RRK exercise.

## Usage

Render three random cubes. User can:

- orbit the camera around the cubes, zoom in and out
- select each, with mouse and keyboard
- push/pull a face to resize a cube (CAD-style extrude)
- select a whole cube and drag it to move it in relation to the other two

The three cuboids always stay connected (each touches at least one of the others) - if a move or resize would break that, it snaps back.

## Rules of the Model

- there is a consistent uniform measurement unit, objects will also have a derived relative measurement to each other
- 3 matte white cuboids that must touch
- the cubes can intersect and pass through each other
- Must sit on a featureless #999 gray surface, no horizon
- camera starts at a 45 degree angle to center of object, default zoom to see all cubes. The view cube can leave that view.
- User can zoom in and out
- objects collection can rotate on center of base face
- bright white single studio light positioned at a 45-degree horizontal angle and 45 degrees above the subject, moving with the camera so every view is lit the same way
- shadows cast on ground and other cubes

## Controls

- **move a cube:** double click it, or press Tab / Shift+Tab, to select the whole cube (orange outline), then click and drag it
- **resize a cube:** click a face to select it (blue highlight), then click and drag it outward/inward to push/pull that side, in clean half-unit steps
- clicking a face of an already-selected cube (without dragging) switches back to selecting just that face
- Escape clears the current selection
- **trackpad:** a two-finger swipe orbits the camera (like dragging the view cube), a pinch zooms. With a mouse, Ctrl + scroll zooms.
- **view cube** (top right, like Fusion 360): drag it to orbit the camera, click one of its faces to snap the camera to that view (top, front, left, ...). A face you are looking at head-on can't be push/pulled, so nudge the view first.

## Technical

- Three.js framework (r128, vendored in `js/three.min.js` - kept at this revision so the page runs from a plain `file://` open, no build step or server)
- inspired by https://github.com/steveturbek/Tangible-Interfaces-Submarine-Design-Project
- keyboard control
- click on cube face to adjust

### Set up

1. [Download this repo zip](https://github.com/steveturbek/Rowena_Reed_Kostellow_rectilinear/archive/refs/heads/main.zip) (or `git clone`)
1. Unzip, perhaps move the folder to your Documents folder
1. In Google Chrome, open the `index.html` file
1. Explore!

### Project Structure

```
├── index.html          # entry point - open this in a browser
├── css/
│   └── style.css       # minimal on-screen instructions overlay
├── js/
│   ├── three.min.js    # vendored Three.js r128 (UMD build)
│   ├── scene.js        # renderer, camera, lighting, ground, render loop
│   ├── cubes.js         # cube data model, random generation, "must touch" rule
│   ├── selection.js      # click/double-click/Tab picking, highlight visuals
│   ├── manipulate.js      # drag-to-move and push/pull-to-resize
│   ├── controls.js         # trackpad: swipe = orbit, pinch = zoom
│   ├── viewcube.js          # top-right view cube: drag to orbit, click a face to snap
│   └── main.js               # wires the modules together, starts the render loop
```

## Nice to have

- Save / Export / Load
- Save data in URL for sharing
- physical joystick control

## Links

- [Rowena Reed Kostellow Saturday Class](https://www.youtube.com/watch?v=Ubf5ZVzeSKU)
- [Rowena Reed Kostellow (July 6, 1900 – September 17, 1988) was an American industrial designer and professor](https://en.wikipedia.org/wiki/Rowena_Reed_Kostellow)
- [Rowena Group](https://www.rowenagroup.org/)

#

“At first working with 3-dimensional forms in this way is difficult. But soon you will begin to speak this language. You really have to make these beautiful. That sounds pretentious. How can you make three blocks beautiful? But I know that you can.”

Make up to fifty rectilinear volumes in clay in various proportions. Clay is the best medium because you can easily add and take away. The edges should read as clearly as possible. Organize the rectangles in groups of three, keeping these four principles in mind:

Appreciate the qualities of contrasting shapes. The volumes you choose should vary in character as much as possible, and no two should have the exact measurements. Learn to assess the volume of an element by eye without measuring.

Establish relationships between the volumes by choosing dominant, subdominant, and subordinate forms. The dominant volume is the most significant, interesting, and dramatic element. It occupies the dominant position in the group.

The subdominant complements the dominant. Unless there is a 20% improvement in the character of the dominant when the subdominant is added, more experimentation is needed. The dominant/subdominant relationship can be exciting due to the contrasts in character and positions. More often than not, the relationship is enhanced if the axes are not parallel.

The subordinate makes the design more interesting by introducing a third visual element and axis. The subordinate should make the design more three-dimensional, complement the existing forms, and complete the unity of the design. It is not as independent as the dominant or subdominant. It should be contrasting but sensitive to the other forms. It must be designed to fill in what is missing in the other two.

Be aware of proportions: overall, inherent, and comparative.

The inherent proportion refers to the proportions within a form: length, width, and thickness.
The comparative proportions are the proportions of one form as it relates to another. Think of a tall, thin person compared to a short, stocky one.
The overall proportion refers to the character or configuration of a group of forms. (If you squint and look at the silhouetted proportions of a group of forms, you will see its overall proportions.) No view should be uninteresting. Emphasize the vertical in some and the horizontal in others. Most students make a horizontal overall proportion—perhaps because it seems more stable. Never emphasize the cube.
Varying the proportions in your design is essential. Make it interesting. The last thing you want is a predictable sequence of forms that looks like “going-going-gone.”

The difference between beautiful and ordinary forms is the sensitivity of these proportions. Sensitivity is an intangible but very real quality. Understanding it is one of the most valuable assets for a visual artist. Too much time cannot be spent developing this sensitivity and becoming intuitively aware of beautiful relationships.

Carefully position the axes of the volumes. The axis refers to an imaginary line through the center of the longest dimension of the form and indicates the most substantial movement of the form. The axis illustrates a form’s position in space. We try to give each volume its position in space in all problems.

In this exercise, keep the axes of the volumes static (perpendicular to each other). The static axis is the simplest and will help you get away from flat compositions. Later, in more advanced exercises, you will try to achieve a variety of movements of the axes. To make your designs more three-dimensional, you should use as many movements of the axes as possible. For now, we start with a more straightforward challenge.

Always conceive a design from all perspectives. Work on a sturdy turntable and continually rotate the sketch to ensure it “reads” from all directions.

Consider how the volumes are joined. There are three ways to join them: piercing, wedging, and cradling.

Ask yourself the following questions as you look at your design:

Is there a contrast between the dominant and subdominant forms?
Are they complementary? Are they too similar in size and shape? Students sometimes tend to repeat the same dimensions.
Is the dominant form in the most prominent position? Students like to put the dominant form on the bottom because that seems to hold things up, but it is not necessarily the dominant position.
Does the subordinate form add something to the three-dimensional quality and unity of the whole? Sometimes, there is a tendency to treat the subordinate as an orphan.
Does the design look good from all perspectives, at eye level, and from the top?
In Summary…
The challenge here is to create unity from forms that are as essentially different as possible. Start by designing the dominant, then the subdominant. Spend a little time on this relationship. Quickly complete the subordinate element and arrange with the others to create a grouping that is as three-dimensional as possible. This will give you a sense of the overall configuration. Then, you can begin to refine. Emphasize either the vertical or horizontal proportion in each sketch. All joinings should appear structural. A balance of directional forces should be established. The design should look exciting and three-dimensional from every position. It should achieve an effect of unity in which every part relates to every other part, and every design relationship contributes to the whole.

Unity is the visual glue that holds everything together. You know that you have achieved it when all the visual relationships within the design are organized in such an exquisite dependent relationship that every element supports and strengthens every other. Any minor change would upset the perfect balance and tension.

Take your best sketch and develop it in plaster. You may want to make your plaster sketch larger than your clay piece—perhaps one and a half or two times larger. Differences in proportion will become more apparent as you enlarge the design.

Enlarging is not simply a matter of copying. It requires attention to subtle changes to achieve a harmonious whole.
