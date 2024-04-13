import React, { useEffect, useState } from "react";
import {
  Image,
  StatusBar,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import tailwind from "twrnc";

import { useHaptic } from "../utils/useHaptic";

function toRad(degrees: number) {
  "worklet";
  return (degrees * Math.PI) / 180;
}

function toDeg(radians: number) {
  "worklet";
  return (radians * 180) / Math.PI;
}

type NotchProps = {
  onValueChange: (value: number) => void;
  highlightAllPrevious?: boolean;
  num_notches?: number;
  scale?: number;
};

export const Dial = ({onValueChange, highlightAllPrevious = true, num_notches = 8, scale = 1.0} : NotchProps) => {
  const D = 170; //170
  const R = D / 2;

  const notches = num_notches + 1;
  const angle = 360 / notches; //45
  // const notches = 360 / angle;

  const sweeping_angle = angle * 2;
  const last_angle = 360 - sweeping_angle / 2;
  const start_angle = sweeping_angle / 2;

  // The space between the circle and the notches
  const distanceFactor = 237.09/D + 0.15;
  // const distanceFactor = D/106;


  const getStrokePosition = (angleInDegrees: number) => {
    const angleInRadians = toRad(angleInDegrees);
    const x = R * distanceFactor * Math.cos(angleInRadians);
    const y = R * distanceFactor * Math.sin(angleInRadians);
    return { x, y };
  };

  const getTransform = (tranformAngle: number): ViewStyle => {
    const { x, y } = getStrokePosition(tranformAngle);
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${tranformAngle}deg` },
      ],
    };
  };

  type NotchesProps = {
    index: number;
    currentAngle: SharedValue<number>;
    playSound: () => void;
  };

  const Notches = ({ index, currentAngle, playSound }: NotchesProps) => {
    const hapticSelection = useHaptic();
    const active = useSharedValue(0);
  
    useAnimatedReaction(
      () => {
        // Calculate the index of the current angle
        let currentAngleIndex = Math.round(currentAngle.value / angle);
        return currentAngleIndex;
      },
      (currentAngleIndex, prevAngleIndex) => {
        if(highlightAllPrevious) {
          if (currentAngleIndex >= index) {
            if (active.value === 0) {
              hapticSelection && runOnJS(hapticSelection)();
              runOnJS(playSound)();
            }
            active.value = withSpring(1);
          } else {
            active.value = withSpring(0);
          }
        }
        else {
          if (currentAngleIndex === index) {
            if (active.value === 0) {
              hapticSelection && runOnJS(hapticSelection)();
              runOnJS(playSound)();
            }
            active.value = withSpring(1);
          } else {
            active.value = withSpring(0);
          }
        }
      },
    );
  
    const currentStrokeAngle = index * angle;
    const animatedStyles = useAnimatedStyle(() => {
      return {
        opacity: interpolate(active.value, [0, 1], [0.45, 1]),
        backgroundColor: interpolateColor(
          active.value,
          [0, 1],
          ["rgba(0,0,0,0.51)", "white"],
          "RGB",
        ),
      };
    });
  
    if (currentStrokeAngle === 0) {
      return null;
    }
  
    return (
      <Animated.View
        key={index}
        style={[
          tailwind.style("absolute h-1 w-5 rounded-3xl"),
          getTransform(currentStrokeAngle),
          animatedStyles,
        ]}
      />
    );
  };

  const currentAngle = useSharedValue(start_angle);

  const gesturePreviousTheta = useSharedValue(0);
  const previousChangedAngle = useSharedValue(0);

  const finalAngleNotReached = useSharedValue(1);

  // const movingForwardGestureReachedLimit = useSharedValue(1);
  // const movingBackwardGestureReachedLimit = useSharedValue(1);

  const findNearestMultiple = (angleValue: number) => {
    "worklet";
    let adjustedAngle = angleValue + angle / 2;
    adjustedAngle = adjustedAngle - (adjustedAngle % angle);
    return adjustedAngle;
  };

  const [localSound, setLocalSound] = useState<Audio.Sound>();
  useEffect(() => {
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/tap_05.mp3"),
      );
      setLocalSound(sound);
    };
    loadSound();
  }, []);

  async function playSound() {
    try {
      if (localSound) {
        // await localSound.setRateAsync(1.2, false);
        await localSound.setPositionAsync(0);
        await localSound.playAsync();
      }
    } catch (e) {}
  }

  const stopSound = () => {
    localSound?.stopAsync();
  };

  const panGesture = Gesture.Pan()
    .onBegin(event => {
      const { x, y } = event;
      const deltaX = x - R; // The Center Coordinates of the Container is now (R, R)
      const deltaY = y - R; // The Center Coordinates of the Container is now (R, R)
      const angleRadians = Math.atan2(deltaY, deltaX);
      const angleDegrees = toDeg(angleRadians);
      let adjustedAngle = angleDegrees;
      adjustedAngle = adjustedAngle < 0 ? adjustedAngle + 360 : adjustedAngle;
      gesturePreviousTheta.value = findNearestMultiple(adjustedAngle);
    })
    .onChange(event => {
      const { x, y } = event;
      const deltaX = x - R; // The Center Coordinates of the Container is now (R, R)
      const deltaY = y - R; // The Center Coordinates of the Container is now (R, R)
      const angleRadians = Math.atan2(deltaY, deltaX);

      const angleDegrees = toDeg(angleRadians);
      let adjustedAngle = angleDegrees;
      adjustedAngle = adjustedAngle < 0 ? adjustedAngle + 360 : adjustedAngle;

      adjustedAngle = findNearestMultiple(adjustedAngle);
      const angleDiff = adjustedAngle - gesturePreviousTheta.value;

      const nextAngle =
        currentAngle.value + (angleDiff - previousChangedAngle.value);
      const changeAngleFactor =
        Math.abs(angleDiff - previousChangedAngle.value) / angle;

      if (
        changeAngleFactor >= 1 &&
        changeAngleFactor <= 2 &&
        finalAngleNotReached.value
      ) {
        if (nextAngle === 360 || nextAngle === 0) {
          return;
        }

        if (nextAngle <= last_angle && nextAngle > 0) {
          currentAngle.value = nextAngle;
          previousChangedAngle.value = angleDiff;
          //Call the onValueChange function with the notch number
          runOnJS(onValueChange)(nextAngle/angle);
        }
      } else {
        if (changeAngleFactor === notches - 1) {
          finalAngleNotReached.value = 0;
        }
        if (changeAngleFactor === 0) {
          finalAngleNotReached.value = 1;
        }
      }
    })
    .onEnd(() => {
      previousChangedAngle.value = 0;
      finalAngleNotReached.value = 1;
      runOnJS(stopSound)();
    });

  const indicatorAnimationStyle = useAnimatedStyle(() => {
    const localGetIndicatorPosition = (angleInDegrees: number) => {
      const angleInRadians = (angleInDegrees * Math.PI) / 180;
      const x = R * 0.6 * Math.cos(angleInRadians);
      const y = R * 0.6 * Math.sin(angleInRadians);
      return {
        transform: [
          { translateX: x },
          { translateY: y },
          { rotate: `${angleInDegrees}deg` },
        ],
      };
    };

    return {
      opacity: 0.8,
      backgroundColor: "rgba(0,0,0,0.51)",
      ...localGetIndicatorPosition(currentAngle.value),
    };
  });
  return (
    <SafeAreaView
      style={tailwind.style("flex-1 items-center justify-end pt-50")}
    >
      <StatusBar barStyle={"dark-content"} />
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            tailwind.style(
              `h-[${D}px] w-[${D}px] rounded-full bg-white shadow-lg flex justify-center items-center`,
            ),
            {
              transform: [{ rotate: "90deg" }, {scale : scale}],
            },
          ]}
        >
          <Image
            source={require("../assets/Dial.png")}
            style={[
              tailwind.style("absolute h-[340px] w-[340px]"),
              { transform: [{ rotate: "-90deg" }, { translateY: 64 }] },
            ]}
          />
          <Animated.View
            style={[
              tailwind.style(
                "absolute h-1.5 w-8 bg-[#FFA500] shadow-sm rounded-2xl",
              ),
              indicatorAnimationStyle,
            ]}
          />
          {Array(notches)
            .fill(1)
            .map((_value, index) => (
              <Notches
                playSound={playSound}
                key={index}
                index={index}
                currentAngle={currentAngle}
              />
            ))}
        </Animated.View>
      </GestureDetector>
    </SafeAreaView>
  );
};
