package com.example.ekeysdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = EkeySdkModule.NAME)
class EkeySdkModule(reactContext: ReactApplicationContext) : NativeEkeySdkSpec(reactContext) {

    override fun getName() = NAME

    override fun initiateLogin(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity to present the login screen from")
            return
        }

        Ekey.initiateLogin(activity) { result ->
            val map = Arguments.createMap()
            when (result) {
                is EkeyLoginResult.Completed -> {
                    map.putString("status", "completed")
                    map.putString("redirectUri", result.redirectUri.toString())
                    map.putString("codeVerifier", result.codeVerifier)
                }
                EkeyLoginResult.Cancelled -> {
                    map.putString("status", "cancelled")
                }
                is EkeyLoginResult.Failed -> {
                    map.putString("status", "failed")
                    map.putString("error", result.error.toString())
                }
            }
            promise.resolve(map)
        }
    }

    companion object {
        const val NAME = "EkeySdk"
    }
}
