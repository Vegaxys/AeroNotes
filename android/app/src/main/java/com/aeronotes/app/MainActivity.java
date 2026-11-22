package com.aeronotes.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge starts in super.onCreate.
        registerPlugin(GoogleDriveAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
