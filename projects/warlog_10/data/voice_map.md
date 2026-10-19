# Bản đồ voice (475.74 s)

Mỗi dòng: mốc câu, rồi nội dung. `‖ 0.8s` = khoảng ngắt dài (chỗ nghỉ tự nhiên). **Đậm** = từ có số hoặc viết hoa giữa câu (ứng viên callout và điểm khớp hình), kèm mốc từ.

`   0.00–   2.80` A radar has a problem that no other sensor has.
`   3.02–   7.12` To find an aircraft, it has to shout, and almost anything can hear a shout.
`   7.32–  11.92` A simple receiver on the aircraft picks up the radar's pulse on its way out, while the
`  11.92–  15.36` radar has to wait for a tiny fraction of the same pulse to bounce back.
`  15.68–  20.18` The radar's signal has to make the whole trip twice, so a pilot can know they are being
`  20.18–  24.74` watched well before the radar can see them, and the radar is the only one in the conversation
`  24.74–  26.66` announcing its position to the whole sky.
`  26.66–  32.18` So, here is the question, how does a machine that is so exposed manage to be the foundation
`  32.18–  36.06` of every air defense, every warship, and every air traffic system on Earth?  **Earth**@35.84
`  36.28–  40.64` The answer is a chain of compromises, because the physics of an echo is brutal.
`  41.08–  45.52` Each design choice in a radar is a decision about which part of that brutality to put up
`  45.52–  45.74` with.
`  46.08–  49.90` Start with the principle, which is simple enough to explain in a sentence.
`  50.30–  55.50` A radar sends out a short burst of radio waves, which travel at the speed of light, and listens
`  55.50–  56.10` for the echo.
`  56.44–  59.12` The time between the burst and the echo gives the distance.
`  59.32–  64.98` A delay of one millionth of a second means a target about 150 meters away, so a delay  **150**@62.58
`  64.98–  68.40` of a thousandth means a target 150 kilometers off.  **150**@66.62
`  68.74–  73.18` The dish turns, and the direction it was pointing when the echo came back gives the bearing.
‖ 0.5s
`  73.72–  77.14` Everything else in radar is an effort to make those two measurements sharper.
‖ 0.6s
`  77.70–  79.04` Then comes the harsh part.
`  79.04–  81.16` The echo is unbelievably weak.
`  81.28–  85.84` The energy that leaves the antenna spreads out in a widening sphere, and the small portion
`  85.84–  88.46` that hits the aircraft spreads out again as it returns.
`  88.68–  93.00` The result is that the power coming back falls with the fourth power of the distance.
`  93.28–  96.20` Double the range and the echo is 16 times fainter.  **16**@95.02
`  96.36– 101.44` To see twice as far, a radar must be 16 times more powerful, or far more sensitive.  **16**@98.74
` 101.78– 106.88` That one fact explains why long-range radars are enormous, and why a small increase in range
` 106.88– 107.74` is so expensive.
` 108.08– 110.04` There is also a timing problem.
` 110.34– 115.10` A radar must wait for the echo of one pulse before it can safely send the next, and the
` 115.10– 118.34` pause between pulses sets how far it can see without confusion.
‖ 0.6s
` 118.90– 123.80` Send pulses quickly and the radar can measure speed well, but an echo from a far target may
` 123.80– 126.54` arrive after the next pulse and be read as a near one.
` 126.90– 130.14` Send them slowly and range is clear, but speed becomes blurred.
‖ 0.5s
` 130.62– 135.34` Radars therefore alternate between modes, using different rhythms for different jobs, and
` 135.34– 137.16` no single rhythm is right for everything.
` 137.46– 140.80` There are only so many ways to deal with an echo that faint.
` 141.16– 145.06` One is to send more power, which is why large radars use megawatts.
` 145.44– 150.02` Another is a bigger antenna, which collects more of what returns and focuses the beam more
` 150.02– 150.56` narrowly.
` 150.68– 154.16` And that is why the biggest warning radars look like the sides of buildings.
` 154.50– 159.18` A third is to listen for longer, adding up many echoes from many pulses until the target
` 159.18– 160.36` rises out of the noise.
` 160.68– 162.02` All of them cost something.
` 162.02– 164.54` More power makes the radar easier to find.
` 164.84– 168.40` A bigger antenna is harder to move, and listening longer is slower.
` 168.74– 173.86` Which wavelength to use is the next decision, and it shows how a radar is built for a purpose.
` 174.26– 178.88` Long waves, in the very high frequency band, bend around the curve of the earth a little,
` 179.08– 182.90` and pass through weather easily, and a radar that uses them can see far.
` 182.90– 187.30` But they cannot tell two close targets apart, and the position they give is rough.
` 187.58– 192.70` Short waves, in the bands used by fire control radars, give a tight beam and fine detail,
` 193.00– 195.78` but they are absorbed by rain, and cannot reach as far.
` 196.14– 201.32` The radar that finds a target, and the radar that guides a missile onto it, are rarely the same set.
` 201.32– 206.40` A second thing that radar measures is movement, and it does this using the Doppler effect.  **Doppler**@205.66
` 206.70– 211.86` An echo from something coming closer comes back at a slightly higher frequency, and from something moving
` 211.86– 216.28` away it comes back lower, in the same way that a siren's pitch changes as it passes.
` 216.28– 219.74` This is how a radar separates an aircraft from a hillside.
` 219.92– 224.34` The hill returns an echo that does not shift, and the aircraft returns one that does.
` 224.62– 227.38` It is a filter that throws away everything standing still.
` 227.58– 232.60` It also has a weakness, because an aircraft flying exactly across the radar's line of sight
` 232.60– 235.74` creates almost no shift, and can disappear into the clutter.
` 235.98– 240.64` A target's size, as the radar sees it, is also not what it looks like to the eye.
` 240.98– 244.78` What counts is how much energy comes back, called the radar cross-section,
` 244.78– 247.94` and it depends on shape and material as much as on bulk.
` 248.06– 251.62` A flat metal plate turned square to the beam is a brilliant mirror,
` 251.78– 255.62` while the same plate tilted a few degrees sends the beam off into the sky.
` 255.86– 260.26` A large aircraft shaped to turn the beam aside can return less than a small bird,
` 260.26– 263.44` and a corner can return more than a sphere ten times its size.
` 263.74– 267.40` The radar measures the echo, and the echo is a property of geometry.
` 267.68– 272.86` That is worth stopping on, because clutter is the real enemy of radar, more than the distance.
` 272.86– 278.90` The ground, the sea, rain, and flocks of birds all send echoes, and a target must be picked out from
` 278.90– 283.90` among them. A radar looking down at a low-flying aircraft is looking at a patch of ground that is  **A**@279.64
` 283.90– 288.80` much brighter than the thing flying over it. Much of the engineering inside a radar is not about  **Much**@286.16
` 288.80– 295.42` seeing, it is about deciding what not to see. Radar also cannot see around the world. Radio waves  **Radar**@291.90 **Radio**@294.64
` 295.42– 301.04` travel in straight lines, and the earth curves away, so there is a horizon beyond which nothing is visible,
` 301.04– 307.08` and a low-flying aircraft can stay under it until it is close. A radar mounted high on a mast sees  **A**@304.68
` 307.08– 312.46` further, and one carried on an aircraft sees much further. This is the reason a country with a coast  **This**@310.60
` 312.46– 317.90` and a lot of sea builds a chain of stations or flies radar aircraft, and why a hill in the wrong place
` 317.90– 323.84` can matter more than the electronics on top of it. The history shows how radical this was. In 1940,  **The**@320.64 **In**@322.92 **1940**@323.26
‖ 0.5s
` 324.30– 329.18` Britain strung a line of tall towers along its southern and eastern coasts, which sent out signals and
` 329.18– 334.78` received echoes from aircraft crossing the channel. The system was crude. It could not see low, and  **The**@331.68 **It**@333.28
` 334.78– 339.80` its answers were relayed by telephone to a room where operators moved markers on a table. But it told  **But**@339.30
` 339.80– 344.34` the fighter squadrons when the raiders were coming and roughly where, so they did not have to be in
` 344.34– 349.58` the air all day. Radar did not win the Battle of Britain alone, but it allowed a smaller air force to  **Radar**@345.44 **Battle**@346.56 **Britain**@346.96
` 349.58– 354.98` be in the right place. The old radars had a physical dish that turned, and the new ones have none.  **The**@351.00
` 354.98– 360.26` A modern phased array radar is a flat panel made of thousands of small transmitters and receivers,
` 360.56– 365.88` and by shifting the timing of each one, it steers the beam without moving anything. It can point in  **It**@364.82
` 365.88– 370.60` a new direction in microseconds, track dozens of targets at once, and keep searching in between.
` 370.94– 376.40` The panel can lose several modules and still work, and a warship can carry four flat panels on its
` 376.40– 381.64` superstructure and watch every direction at once without turning a single part. Some of these can also  **Some**@380.40
` 381.64– 386.80` switch between searching, tracking, and even guiding missiles in the same second. There is a cost,  **There**@385.74
` 386.84– 391.04` and it is money, because each module is a small, precise radio of its own.
` 391.46– 397.08` What does the radar's enemy do about it? The answer is that a radar can be jammed by a transmitter that  **The**@393.68
` 397.08– 402.64` pours noise into its receiver, or deceived by something that sends back a false echo. It can be  **It**@402.04
` 402.64– 409.06` avoided by flying low or by hugging terrain, and it can be hunted. Special missiles home onto the radar's  **Special**@407.08
` 409.06– 414.12` own signal, and fly down the beam to the antenna. So the radar that stays on becomes a target,  **So**@411.76
` 414.28– 419.54` and a good operator switches off, moves, and switches back on somewhere else. A radar crew's  **A**@418.68
` 419.54– 425.22` survival depends on being silent. Which brings us to what is easy to get wrong. People talk about  **Which**@421.60 **People**@424.26
` 425.22– 431.60` radar as if it either sees an aircraft or does not. In truth, it works in probabilities. At each distance,  **In**@428.28 **At**@430.64
` 431.64– 436.30` there is a chance of detecting a given target, and the chance falls as the distance grows and the
` 436.30– 441.62` target gets smaller, and the clutter gets worse. A radar that is said to see a hundred kumliters is  **A**@438.66
` 441.62– 446.80` really a radar that sees a certain type of target at that range, with a certain probability. That is  **That**@446.30
` 446.80– 452.58` my own way of putting it, but it suggests that a radar has no range, it has a curve. So return to  **So**@451.86
` 452.58– 458.14` the radar that has to shout, and the aircraft that hears it first. Every part of the set, the powerful  **Every**@456.24
` 458.14– 464.00` pulse, the huge antenna, the filter that discards what stands still, the chain of towers, and the tiles of
` 464.00– 469.66` the phased array, exists to get more information out of an echo that is almost not there. A radar  **A**@469.00
` 469.66– 475.16` does not see the sky. It reconstructs it from a whisper in a room that is becoming louder every year.  **It**@471.06
‖ 0.6s (đuôi)
