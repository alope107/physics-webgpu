export const dist = (p1, p2) =>  Math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2);

export const intersection = /* wgsl */`
// xy is intersection point iff z != 0
// if z = 0 then no intersection
fn intersection(s1 : vec2f, e1 : vec2f, s2 : vec2f, e2 : vec2f) -> vec3f {
    // return vec3(1., 1., 1.);
    let line1cross = cross(vec3(s1, 1.), vec3(e1, 1.));
    let line2cross = cross(vec3(s2, 1.), vec3(e2, 1.));

    let crossCross = cross(line1cross, line2cross);

    //TODO select?
    if(crossCross.z == 0) {return vec3(0, 0, 0);}
    // return vec3f(1.,1.,1.);
    let intersection = crossCross / crossCross.z;

    // TODO smarter
    return select(vec3(),
        intersection,
        ((intersection.x < s1.x) != (intersection.x < e1.x)) &&
       ((intersection.y < s1.y) != (intersection.y < e1.y)) &&
       ((intersection.x < s2.x) != (intersection.x < e2.x)) &&
       ((intersection.y < s2.y) != (intersection.y < e2.y))
    );
}
`