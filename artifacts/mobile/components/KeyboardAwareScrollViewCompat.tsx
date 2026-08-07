import React from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

type KeyboardAwareScrollViewComponent = React.ComponentType<ScrollViewProps>;

function getKeyboardAwareScrollView(): KeyboardAwareScrollViewComponent | null {
  try {
    const module = require("react-native-keyboard-controller");
    return module.KeyboardAwareScrollView as KeyboardAwareScrollViewComponent;
  } catch {
    return null;
  }
}

const KeyboardAwareScrollView = getKeyboardAwareScrollView();

type Props = ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web" || !KeyboardAwareScrollView) {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
