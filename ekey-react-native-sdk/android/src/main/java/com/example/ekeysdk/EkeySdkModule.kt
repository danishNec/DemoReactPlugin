package com.example.ekeysdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
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
                    map.putMap("claims", toWritableMap(result.identity.claims))
                    result.identity.kycData?.let { map.putMap("kycData", toWritableMap(it)) }
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

    /** Converts the plain Map/List/primitive tree from EkeyTokenExchange into RN's bridge types. */
    private fun toWritableMap(map: Map<String, Any?>): WritableMap {
        val writable = Arguments.createMap()
        map.forEach { (key, value) -> putDynamic(writable, key, value) }
        return writable
    }

    private fun toWritableArray(list: List<Any?>): WritableArray {
        val writable = Arguments.createArray()
        list.forEach { value -> addDynamic(writable, value) }
        return writable
    }

    private fun putDynamic(map: WritableMap, key: String, value: Any?) {
        when (value) {
            null -> map.putNull(key)
            is String -> map.putString(key, value)
            is Boolean -> map.putBoolean(key, value)
            is Int -> map.putInt(key, value)
            is Long -> map.putDouble(key, value.toDouble())
            is Double -> map.putDouble(key, value)
            is Float -> map.putDouble(key, value.toDouble())
            is Map<*, *> -> @Suppress("UNCHECKED_CAST") map.putMap(key, toWritableMap(value as Map<String, Any?>))
            is List<*> -> map.putArray(key, toWritableArray(value))
            else -> map.putString(key, value.toString())
        }
    }

    private fun addDynamic(array: WritableArray, value: Any?) {
        when (value) {
            null -> array.pushNull()
            is String -> array.pushString(value)
            is Boolean -> array.pushBoolean(value)
            is Int -> array.pushInt(value)
            is Long -> array.pushDouble(value.toDouble())
            is Double -> array.pushDouble(value)
            is Float -> array.pushDouble(value.toDouble())
            is Map<*, *> -> @Suppress("UNCHECKED_CAST") array.pushMap(toWritableMap(value as Map<String, Any?>))
            is List<*> -> array.pushArray(toWritableArray(value))
            else -> array.pushString(value.toString())
        }
    }

    companion object {
        const val NAME = "EkeySdk"
    }
}
