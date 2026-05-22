import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import "./style.css";

export const Root: React.FC = () => (
  <Composition
    id="ReelForgeLaunch"
    component={Main}
    durationInFrames={538}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{}}
  />
);
