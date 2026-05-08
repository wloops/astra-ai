## 1. 閰嶇疆灞傦紙鍚庣锛?
- [x] 1.1 `config.py` 鏂板 `llm_model_profiles: str = ""`銆乣llm_stage_routing: str = ""`銆乣llm_role_routing: str = ""` 涓変釜閰嶇疆椤?- [x] 1.2 鏂板 `model_registry.py`锛歚parse_profiles()`銆乣parse_routing()`銆乣resolve_model()` 妯″潡绾у嚱鏁?- [x] 1.3 `resolve_model()` 瀹炵幇 Session瑕嗙洊 > Role璺敱 > Stage璺敱 > Default Profile > `settings.llm_model` 浼樺厛绾ч摼

## 2. LLM Gateway 鏀归€狅紙鍚庣锛?
- [x] 2.1 `llm_gateway.py` `complete_structured()` 鏂板 `model_overrides` 鍙傛暟锛岃皟鐢?`resolve_model()` 鑾峰彇 profile
- [x] 2.2 `_complete_remote()` 鎺ュ彈 `model`/`base_url`/`api_key` 鍙傛暟锛堜粠 profile 浼犲叆锛夛紝涓嶅啀纭紪鐮?`settings.llm_model`
- [x] 2.3 `_complete_remote()` 鏃ュ織澧炲姞 `model` 瀛楁
- [x] 2.4 鍚戝悗鍏煎锛歚_complete_remote()` 鏃犲弬鏃朵粛浣跨敤 `settings.llm_*` 鍏ㄥ眬閰嶇疆

## 3. 鏁版嵁妯″瀷鍙樻洿锛堝悗绔級

- [x] 3.1 `models.py` `DiscussionSessionBase` 鏂板 `model_overrides: dict[str, str]` JSON 瀛楁
- [x] 3.2 `schemas.py` `SessionCreate` 鏂板 `model_overrides: dict[str, str] = {}`
- [x] 3.3 `schemas.py` 鏂板 `ModelProfile`銆乣ModelTestRequest`銆乣ModelTestResult` schema

## 4. /models 绔偣锛堝悗绔級

- [x] 4.1 `main.py` 鏂板 `GET /models/profiles`锛氳繑鍥炶姳鍚嶅唽锛堣劚鏁?api_key锛屼粎淇濈暀 name/model/base_url 鍩熷悕锛?- [x] 4.2 `main.py` 鏂板 `POST /models/test`锛氭帴鍙?`{"profile_name":"strong"}`锛屽悜璇?profile 鍙戞渶灏忚姹傞獙璇佽繛閫氭€э紝杩斿洖鐘舵€佸拰鑰楁椂
- [x] 4.3 涓や釜绔偣澶嶇敤 `model_registry.py` 鐨?parse/resolve 鍑芥暟

## 5. Session 鍒涘缓闆嗘垚锛堝悗绔級

- [x] 5.1 `main.py` `POST /sessions` 鍒涘缓鏃跺瓨鍌?`model_overrides` 鍒?DiscussionSession
- [x] 5.2 `orchestrator.py` `complete_structured()` 璋冪敤鏃朵紶鍏?`session.model_overrides`
- [x] 5.3 `orchestrator.py` 鍐欏叆 `agent_message` 浜嬩欢鏃跺湪 payload 涓檮甯?`model_used` 瀛楁

## 6. 鍓嶇绫诲瀷涓?API Client

- [x] 6.1 `types.ts` 鏂板 `ModelProfile`銆乣ModelTestResult` 绫诲瀷
- [x] 6.2 `types.ts` `SessionCreatePayload` 鏂板 `model_overrides?: Record<string, string>`
- [x] 6.3 `client.ts` 鏂板 `getModelProfiles()`銆乣testModel(profileName)` 鏂规硶

## 7. 鍓嶇妯″瀷閫夋嫨闈㈡澘

- [x] 7.1 鏂板缓 `ModelSelector.tsx` 缁勪欢锛氳〃鏍煎睍绀烘瘡涓樁娈靛強鍏跺綋鍓嶆ā鍨嬶紙鏍囧噯鏉ユ簮锛夛紝涓嬫媺閫夋嫨瑕嗙洊
- [x] 7.2 褰撲粎鏈変竴涓?profile 鏃惰嚜鍔ㄩ殣钘忥紙涓嶅共鎵扮敤鎴凤級
- [x] 7.3 `StartSession.tsx` / `StartSessionForm.tsx` 闆嗘垚 ModelSelector锛屾彁浜ゆ椂鎼哄甫 `model_overrides`

## 8. 鍓嶇妯″瀷鏍囩

- [x] 8.1 `Workspace.tsx` Agent 鍙戣█鍗＄墖鏄剧ず妯″瀷鍚嶇О鏍囩锛堜粠 `event.payload.model_used` 璇诲彇锛?- [x] 8.2 鏃?`model_used` 鏃堕殣钘忔爣绛撅紙鍏煎鏃ф暟鎹級

## 9. 娴嬭瘯

- [x] 9.1 `tests/test_model_registry.py`锛歱rofiles 瑙ｆ瀽銆佽矾鐢辫В鏋愩€乺esolve_model 浼樺厛绾ч摼娴嬭瘯
- [x] 9.2 `tests/test_llm_gateway.py` 鏇存柊锛氬妯″瀷璺敱璋冪敤 + 鍚戝悗鍏煎鍗曟ā鍨?- [x] 9.3 `tests/test_models_api.py`锛欸ET /models/profiles 鑴辨晱銆丳OST /models/test 鎴愬姛/澶辫触/profile涓嶅瓨鍦?- [x] 9.4 `tests/test_models_api.py`锛歋ession 鍒涘缓鍚?model_overrides銆乷rchestrator 浜嬩欢鍚?model_used
- [x] 9.5 鍓嶇 `client.test.ts` 鏂板 getModelProfiles銆乼estModel 鏂规硶娴嬭瘯

