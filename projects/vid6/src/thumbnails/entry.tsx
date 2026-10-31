import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Thumb1Cutaway } from './Thumb1Cutaway';
import { Thumb2Engineering } from './Thumb2Engineering';
import { Thumb3Xray } from './Thumb3Xray';

registerRoot(() => (
  <>
    <Composition id="thumb-1-cutaway" component={Thumb1Cutaway} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="thumb-2-engineering" component={Thumb2Engineering} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="thumb-3-xray" component={Thumb3Xray} durationInFrames={1} fps={30} width={1920} height={1080} />
  </>
));
