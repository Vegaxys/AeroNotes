package com.aeronotes.app;

import android.app.Activity;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.ClearTokenRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.util.Arrays;

/**
 * Google access tokens for the Drive sync, through Google Play services'
 * authorization API. Android identifies the app by its package and signing
 * certificate (the "Android" OAuth client of the Cloud project), so there is
 * no client secret, no redirect and no refresh token to keep: asking again
 * returns a fresh token silently once the user has consented.
 */
@CapacitorPlugin(name = "GoogleDriveAuth")
public class GoogleDriveAuthPlugin extends Plugin {

    private static final String DRIVE_APPDATA = "https://www.googleapis.com/auth/drive.appdata";
    private static final String USERINFO_EMAIL = "https://www.googleapis.com/auth/userinfo.email";

    private ActivityResultLauncher<IntentSenderRequest> consentLauncher;
    /** The authorize() call waiting for the consent screen to close. */
    private PluginCall pendingCall;

    @Override
    public void load() {
        // Must be registered while the activity is being created: plugins load in onCreate.
        consentLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            this::onConsentResult
        );
    }

    private AuthorizationClient client() {
        return Identity.getAuthorizationClient(getActivity());
    }

    /**
     * Resolves { accessToken }. With interactive=false it never shows UI and
     * rejects with code CONSENT_REQUIRED when the user has to choose an
     * account or consent first.
     */
    @PluginMethod
    public void authorize(PluginCall call) {
        boolean interactive = Boolean.TRUE.equals(call.getBoolean("interactive", true));
        AuthorizationRequest request = AuthorizationRequest.builder()
            .setRequestedScopes(Arrays.asList(new Scope(DRIVE_APPDATA), new Scope(USERINFO_EMAIL)))
            .build();
        client().authorize(request)
            .addOnSuccessListener(result -> {
                if (!result.hasResolution()) {
                    resolveWith(call, result);
                } else if (!interactive) {
                    call.reject("Google consent required", "CONSENT_REQUIRED");
                } else {
                    pendingCall = call;
                    IntentSenderRequest consent = new IntentSenderRequest.Builder(
                        result.getPendingIntent().getIntentSender()
                    ).build();
                    consentLauncher.launch(consent);
                }
            })
            .addOnFailureListener(error -> call.reject(error.getMessage(), "AUTHORIZATION_FAILED", error));
    }

    private void onConsentResult(ActivityResult activityResult) {
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call == null) return;
        if (activityResult.getResultCode() != Activity.RESULT_OK) {
            call.reject("Sign-in cancelled", "CANCELLED");
            return;
        }
        try {
            resolveWith(call, client().getAuthorizationResultFromIntent(activityResult.getData()));
        } catch (ApiException error) {
            call.reject(error.getMessage(), "AUTHORIZATION_FAILED", error);
        }
    }

    private void resolveWith(PluginCall call, AuthorizationResult result) {
        // Granular consent: the user may untick Drive on the consent screen.
        if (!result.getGrantedScopes().contains(DRIVE_APPDATA)) {
            call.reject("Google Drive access was not granted", "SCOPE_DENIED");
            return;
        }
        JSObject answer = new JSObject();
        answer.put("accessToken", result.getAccessToken());
        call.resolve(answer);
    }

    /** Drops a token from Play services' cache (refused by Drive, or signing out). */
    @PluginMethod
    public void clearToken(PluginCall call) {
        String token = call.getString("accessToken");
        if (token == null) {
            call.resolve();
            return;
        }
        client().clearToken(ClearTokenRequest.builder().setToken(token).build())
            .addOnSuccessListener(ignored -> call.resolve())
            .addOnFailureListener(error -> call.reject(error.getMessage(), "CLEAR_FAILED", error));
    }
}
