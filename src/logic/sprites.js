import {ImageLoader} from "2d-gl";
import shipUrl from "../images/ship.png";

export const spriteLoader = new ImageLoader();

// preload sprites
spriteLoader.get("ship", shipUrl);

