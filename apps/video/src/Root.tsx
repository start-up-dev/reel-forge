import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import "./style.css";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="walkthrough"
        component={Main}
        durationInFrames={1350}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="vertical"
        component={Main}
        durationInFrames={1350}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
