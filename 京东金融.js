auto();

var config = files.isFile("jd_config.js") ? require("jd_config.js") : {};
var default_config = {
    password: "", // 锁屏密码
    max_retry_times: 10, // 最大失败重试次数
    timeout: 12000, // 超时时间：毫秒
};

if (typeof config !== "object") {
    config = {};
}
var options = Object.assign(default_config, config); // 用户配置合并
start(options);

/**
 * 开始运行
 * @param options
 */
function start(options) {
    // 子线程监听音量上键
    threads.start(function () {
        events.observeKey();
        events.onceKeyDown("volume_up", function (event) {
            storages.remove(source);
            toastLog("停止脚本");
            engines.stopAll();
            exit();
        });
    });

    var isScreenOn = device.isScreenOn(); // 屏幕是否点亮
    if (!isScreenOn) {
        log("唤醒");
        device.wakeUp();
        sleep(500);
    }

    this.checkModule();

    var Robot = require("Robot.js");
    var robot = new Robot(options.max_retry_times);
    var jdFinancial = new JDFinancial(robot, options);

    // 先打开APP，节省等待时间
    threads.start(function () {
        jdFinancial.openApp();
    });

    if (files.exists("Secure.js")) {
        console.log("存在secure.js");
        var Secure = require("Secure.js");
        var secure = new Secure(robot, options.max_retry_times);
        secure.openLock(options.password, options.pattern_size);
    }

    // jdFinancial.launch();
    jdFinancial.work();

    exit();
}

/**
 * 检查必要模块
 */
function checkModule() {
    if (!files.exists("Robot.js")) {
        throw new Error("缺少Robot.js文件，请核对第一条");
    }

    if (!files.exists("Secure.js") && context.getSystemService(context.KEYGUARD_SERVICE).inKeyguardRestrictedInputMode()) {
        throw new Error("缺少Secure.js文件，请核对第一条");
    }
}

function JDFinancial(robot, options) {
    this.robot = robot;
    options = options || {};
    var settings = {
        timeout: 12000,
        max_retry_times: 10
    };
    this.options = Object.assign(settings, options);
    this.package = "com.jd.jrapp";

    this.openApp = function () {
        toastLog("即将签到，按音量上键停止");

        launch(this.package);
    };

    this.closeApp = function () {
        this.robot.kill(this.package);
    };

    this.launch = function () {
        console.log("do launch");
        var times = 0;
        do {
            if (this.doLaunch()) {
                return;
            } else {
                times++;
                this.closeApp();
                this.openApp();
            }
        } while (times < this.options.max_retry_times);

        toastLog("运行失败");
        engines.stopAll();
        exit();
    };

    this.doLaunch = function () {
        sleep(4000);
        var jump = text("跳过");
        if (jump.exists()) {
            console.log("找到 跳过");
            jump.findOnce().click();
        }

        // let meObj = id("fifthLayout");
        // if (meObj) {
        //     return meObj.findOne(this.options.timeout).click();
        // } else {
        //     console.log("没找到 我的控件");
        //     return false;
        // }

        // var me;
        // if (me = id("tv_fourth_icon").text("我").findOne(this.options.timeout)) {
        //     return me.parent().click();
        // } else {
        //     return false;
        // }

    };

    this.work = function () {
        sleep(3000);
        var success = false;
        for (var times = 0;times < this.options.max_retry_times;times++) {
            if (this.signIn()) {
                success = true;
                toastLog("签到成功");
                break;
            }
        }

        if (!success) {
            toastLog("签到失败");
        }

        return false;
    };

    this.signIn = function() {

        // var me = id("home_header_grid_icon").findOne(this.options.timeout);
        // if (me.parent()) {
        //     console.log("找到签到");
        //     me.parent().click();
        // }

        if (id("tv_item_label").textMatches(/已签\d+天/).exists()) return true;

        var sign_in = text("签到");
        if (sign_in.exists()) {
            console.log("找到签到");
        }
        if (!sign_in.exists()) return false;

        if (!sign_in.findOnce().parent().parent().click()) return false;

        sleep(3000);


        //         className("android.view.View").text("签到领钢镚").findOne().parent().click();
        var btn;
        var success;
        if (btn = className("android.view.View").text("签到领钢镚").findOne(this.options.timeout)) {
            success = btn.parent().click();
        } else {
            success = false;
        }
        sleep(1000);
        className("android.view.View").text("立即获得").findOne().click();




        this.robot.back();
        sleep(1500);

        return success;
    };
}
