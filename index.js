

// 日期插件
// Date: 2017-11-01

// 使用方式
// ie9 +
// 给日期元素设定 simudatepickter 属性

// ie9 -
// 需要手动绑定
// 多个的话循环绑定
// new SiMuDatePickter({
//     targetEl: 触发元素
// })

// data-format属性， 日期格式
// 选定日期确定后，开始日期放置在 data-start-date属性中
// 结束日期放置在 data-end-date属性中


'use strict';

;(function(global, factory){

    if( typeof module === 'object' && typeof module.exports === 'object' ){
        module.exports = factory( global, true )
        
    }else {
        factory( global )
    }
})(typeof window === 'object' ? window:this, function( window, hasGlobal ){

    

function SiMuDatePickter( opt ){
    this.maintemplate = 
        '<div class="simu-datepickter-body">\
            <a class="datepickter-arrow arrow-left" data-type="left"></a>\
            <a class="datepickter-arrow arrow-right" data-type="right"></a>\
            <div class="datepickter-panel">\
                <div id="{{listid}}" class="datepickter-list">\
                    {{items}}\
                </div>\
            </div>\
        </div>\
        <div class="simu-datepickter-footer">\
            <input readonly id="{{startid}}" class="datepickter-input start-input" value="{{startdate}}">\
            <span>-</span>\
            <input readonly id="{{endid}}" class="datepickter-input end-input" value="{{enddate}}">\
            <div class="datepickter-btns">\
                <button class="datepickter-btn btn-sure" data-type="sure">确定</button>\
                <button class="datepickter-btn btn-cancel" data-type="cancel">取消</button>\
            </div>\
        </div>';

    this.itemstemplate = 
        // '<div class="datepickter-item">\
        '<h2 class="datepickter-title">\
            {{date}}\
        </h2>\
        <div class="datepickter-week">\
            {{week}}\
        </div>\
        <ul class="datepickter-days">\
            {{days}}\
        </ul>'
        // </div>'
    
    this.id = 'simudate_' + random()
    this.listid = this.id + '_list'
    this.startid = this.id + '_start'
    this.endid = this.id + '_end'

    this.el = create( 'div', 'simu-datepickter' )
    this.el.id = this.id

    // 蒙版
    this.maskel = query('simu_datepickter_mask') || create( 'div', 'simu-datepickter-mask' )
    this.maskel.id = 'simu_datepickter_mask'
    // this.maskel.appendChild( this.el )
    
    this.clickcount = 0
    this.moveIndex = 0

    // 默认配置
    this.options = {
        targetEl: null,    // 触发目标元素

        format: 'yyyy-MM-dd',           // 展示结果格式
        headDateFormat: 'yyyy年MM月',   // 头部日期标题格式
        // limitFormat: 'yyyy/MM/dd',      // 区间日期样式

        splitCh: '至',  // 分隔字符

        week: ['日','一','二','三','四','五','六'],

        itemWidth: 180,
        itemMargin: 12,
        itemCount: 3,   //展示面板个数

        sure: {
            text: '确定',
            callback: function(){}
        },
        cancel: {
            text: '取消',
            callback: function(){}
        }
    }

    opt = opt || {}
    clone( this.options, opt )
    this.init()
}


// 月份对应天数
var monthday = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


// 原型方法
SiMuDatePickter.prototype = {

    init: function(){
        var self = this
        
        // 开始对象
        this.start = {
            el: null,
            input: null,
            time: 0,
            date: null,
            datestr: this.formatDate( this.options.format )
        }        
        // 结束对象
        this.end = clone( {}, this.start )

        this.render()        

        // 等待渲染后绑定
        setTimeout(function(){
            self.start.input = query( self.startid )
            self.end.input = query( self.endid )

            self.events.call(self)
            self.resize.call(self)
            self.setInitValue.call(self)
        }, 100)
    },


    resize: function(){
        var list = query( this.listid )
        var o = this.options

        if( !list ){
            return
        }
    
        this.moveWidth = o.itemWidth + o.itemMargin * 2
        list.style.width = this.moveWidth * o.itemCount + 'px'

        for( var i=0; i<list.childNodes.length; i++ ){
            var item = list.childNodes[i]
            if(item.tagName === 'DIV'){
                item.style = 'width:'+o.itemWidth+'px; margin: 0 '+o.itemMargin+'px';
            }
        }
    },


    events: function(){
        var self = this

        this.el.onselectstart = function(e){ return false; }

        
        listener( this.maskel, 'click', function(){
            self.hide.call(self)
        })

        
        var target = this.options.targetEl
        if( target ){
            listener( target, 'click', function(){
                self.show.call(self)
            })
        }

        // 单击事件
        listener( this.el, 'click', function(e){
            e = e || window.event
            e.stopPropagation && e.stopPropagation()
            e.cancelBubble = true
            
            var target = e.target || e.srcElement
            var type = target.getAttribute('data-type')  
            
            switch( type ){
                case 'day': 
                    self.onSelectDay.call(self, target);
                    break;

                case 'left': 
                    self.onMoveLeft.call(self);
                    break;
                    
                case 'right': 
                    self.onMoveRight.call(self);
                    break;

                case 'sure': 
                        self.onSure.call(self);
                        break;
                    
                case 'cancel': 
                    self.hide.call(self);
                    break;
            }
        })
    },


    setInitValue: function(){
        var value = this.options.initValue
        if( !value ){
            return;
        }

        var dates = value.split( this.options.splitCh )

        this.start.datestr = dates[0] || this.formatDate()
        this.end.datestr = dates.length>1 && dates[1] || this.start.datestr
        
        // this.render()    
        var startdate = this.start.datestr.replace(/[^\d]/g, '/')
        var enddate = this.end.datestr.replace(/[^\d]/g, '/')

        this.start.date = new Date( startdate )
        this.start.time = this.start.date.getTime()

        this.end.date = new Date( enddate )
        this.end.time = this.end.date.getTime()

        this.selectLimit(this.start.time, this.end.time)
    },


    // 选中天
    onSelectDay: function( target ){  
        var format = this.options.format
        var start = this.start
        var end = this.end

        var time = target.getAttribute('data-time') - 0
        var d = new Date(time)
        var datestr = this.formatDate( d, format )
        
        this.clickcount ++
        if( this.clickcount === 1 ){
            this.clearStartEnd()
            this.clearLimit()

            this.copyValue(this.start, d, datestr, target, time)
            this.copyValue(this.end, d, datestr, target, time)
        }                
        else{
            this.copyValue(this.end, d, datestr, target, time)

            // 结束比开始小
            if( time < start.time ){ 
                // end.input.value = start.input.value
                this.copyValue(this.end, start.date, start.datestr, start.el, start.time)
                this.copyValue(this.start, d, datestr, target, time)
            }

            this.selectLimit(start.time, end.time)
            this.clickcount = 0
        }
        
        toggleClass( target, 'datepickter-selected' )
    },


    // 呆板呆板的赋值
    copyValue: function( obj, date, datestr, el, time ){
        obj.date = date
        obj.datestr = datestr
        obj.input.value = datestr
        obj.el = el
        obj.time = time
    },


    // 点击确定
    onSure: function(){
        var callback = this.options.sure.callback
        var target = this.options.targetEl

        if( callback ){
            callback( [this.start.datestr, this.end.datestr] )
        }

        if( target ){
            var datestr = this.start.datestr + this.options.splitCh + this.end.datestr

            if( 'INPUT,TEXTAREA'.indexOf(target.tagName) !== -1 ){
                target.setAttribute('value', datestr)
                target.value = datestr
            }else{
                target.innerHTML = datestr
            }

            target.setAttribute('data-start-date', this.start.datestr)
            target.setAttribute('data-end-date', this.end.datestr)
        }

        this.hide()
    },


    // 
    onMoveLeft: function(){
        var list = query( this.listid )
        var cur = parseInt( list.style.left ) || 0
        var isCreate = false

        // 检测是否需要新增日历版块
        var maxLeft = -(this.options.itemCount - 3) * this.moveWidth  
        if( cur === 0 || cur === maxLeft ){
            this.isCreateItem( list, 1 )
            isCreate = true
        }

        this.move( list, -1, cur, isCreate )
    },


    // 
    onMoveRight: function(){
        var list = query( this.listid )
        var cur = parseInt( list.style.left ) || 0
        var isCreate = false

        // 检测是否需要新增日历版块
        if( cur === 0 ){
            this.isCreateItem( list, -1 )
            isCreate = true
        }

        this.move( list, 1, cur, isCreate )
    },


    // 面板移动核心函数
    // list: 日历面板容器
    // direction: 移动方向， 1：往右， -1:往左
    // cur: list的当前left值
    // isCreate: 是否新创建了元素
    move: function( list, direction, cur, isCreate ){
        var left = direction>0 && isCreate ? cur - direction * this.moveWidth: cur

        // 新增日历版块后先保持原有left不动
        list.style.left = left + 'px'        
        list.moveleft = direction * this.moveWidth

        var lastLeft = left + list.moveleft

        // 位移
        list.style.transition = 'transform 0.3s'
        list.style.transform = 'translate(' + list.moveleft + 'px, 0px)'
        
        // 为兼容ie9-, 用left配合transform使用
        clearTimeout( this.movekey )
        this.movekey = setTimeout(function(){
            list.style.left = lastLeft + 'px'
            list.style.transition = 'transform 0s'
            list.style.transform = 'translate(0px, 0px)'
        }, 200)
    },


    // 是否新增日历面板
    // list: 列表对象
    // direction: 1,右边新增，-1左边新增
    isCreateItem: function( list, direction ){        
        var d = direction>0 ? this.rightdate: this.leftdate
        d.setMonth( d.getMonth() + direction )

        var item = this.createItem( d )

        direction > 0 ?
            list.appendChild( item ):            
            list.insertBefore( item, list.firstChild )

        this.options.itemCount ++
        this.resize()
    },


    // 清除元素选中样式
    clearStartEnd: function(){
        if( this.start.el ){ 
            removeClass( this.start.el, 'datepickter-selected' )     
        }   

        if( this.end.el ){ 
            removeClass( this.end.el, 'datepickter-selected' )     
        }  
    },
    

    // 创建星期
    createWeek: function(){
        var html = ''
        var week = this.options.week

        for( var i=0; i<week.length; i++ ){
            html += '<span>' + week[i] + '</span>'
        }
        return html
    },


    // 创建天数
    createDays: function( d ){
        var year = d.getFullYear()
        var month = d.getMonth()
        monthday[1] = this.isRun(year) ? 29: 28

        var days = monthday[ month ]
        var tempd = new Date(year, month, 1)
        var week = tempd.getDay()

        var html = ''
        var firstMarLeft = week * this.options.itemWidth / 7

        for( var i=1; i<=days; i++ ){
            var curd = new Date(year, month, i)

            html += '<li data-type="day" data-time="' + curd.getTime() + '"'
            html += this.isToday( curd ) ? ' class="datepickter-cur"': ''
            html += i === 1 ? ' style="margin-left:' + firstMarLeft + 'px"': ''
            html += '>' + i + '</li>'
        }

        return html
    },

    
    // 创建一个版块
    createItem: function( d ){
        var itemel = create('div', 'datepickter-item')
        var html = this.itemstemplate
        
        var datestr = this.formatDate( d, this.options.headDateFormat )  
        var weekstr = this.createWeek()
        var daysstr = this.createDays( d )
        
        html = html.replace( '{{date}}', datestr )
        html = html.replace( '{{week}}', weekstr )
        html = html.replace( '{{days}}', daysstr )

        itemel.innerHTML = html
        return itemel
    },


    // 整体渲染
    render: function(){
        var half = Math.floor( this.options.itemCount / 2 ) // 二分
        var itemsHtml = ''
        
        for( var i = -half; i <= half; i++ ){
            var d = new Date()
            d.setMonth( d.getMonth() + i )

            if( i === -half ){
                this.leftdate = d
            }
            
            if( i === half ){
                this.rightdate = d
            }

            itemsHtml += this.createItem(d).outerHTML
        }

        var html = this.maintemplate.replace('{{items}}', itemsHtml)

        html = html.replace('{{listid}}', this.listid)
        html = html.replace('{{startid}}', this.startid)
        html = html.replace('{{startdate}}', this.start.datestr)        
        html = html.replace('{{endid}}', this.endid)
        html = html.replace('{{enddate}}', this.end.datestr)

        this.el.innerHTML = html

        var body = document.body || document.documentElement   
        // 蒙版
        if( !query(this.maskel.id) ){
            body.appendChild( this.maskel )
        }

        if( !query( this.id ) ){ 
            body.appendChild( this.el )
        }
    },


    // 选中区间
    selectLimit: function(startTime, endTime){
        if( startTime === endTime ){
            return;
        }

        var items = this.el.getElementsByTagName('li')
        for(var i=0, len=items.length; i<len; i++){
            var item = items[i]
            var time = item.getAttribute('data-time') - 0

            removeClass( items[i], 'datepickter-selecting' )
            if( time>startTime && time<endTime ){
                addClass( item, 'datepickter-selecting' )
            }

            if( time === startTime || time === endTime ){
                addClass( item, 'datepickter-selected' )
            }
        }
    },


    // 取消选中ing
    clearLimit: function(){
        var items = this.el.getElementsByTagName('li')

        for(var i=0, len=items.length; i<len; i++){
            removeClass( items[i], 'datepickter-selecting' )
        }
    },


    show: function(){
        var target = this.options.targetEl
        if( target ){
            var pos = getPos( target )
            var scrollTop = 
                document.body && document.body.scrollTop || 
                document.documentElement && document.documentElement.scrollTop

            var top = pos.top + target.offsetHeight + scrollTop
                        
            this.el.style.left = pos.left + 'px'
            this.el.style.top = top + 'px'
        }

        this.maskel.style.display = 'block'
        this.el.style.display = 'block'
    },


    hide: function(){
        this.maskel.style.display = 'none'
        this.el.style.display = 'none'
    },

    
    isToday: function( d ){
        var cur = new Date()
        return d.getFullYear()===cur.getFullYear() && d.getMonth()===cur.getMonth() && d.getDate()===cur.getDate()
    },


    // 是否是闰年
    isRun: function( year ){
        return year%400===0 || year%4===0 && year%100!==0
    },
    

    // 获取日期对应毫秒时间
    getDateTime: function( d ){
        d = d || new Date()
        return d.getTime()
    },


    // 格式化date
    formatDate: function( d, format ){
        if( type(d) === 'string' ){
            format = d
            d = new Date()
        }

        d = d || new Date()
        format = format || this.options.format

        var obj = {
            yyyy: d.getFullYear(),
            yy: d.getYear(),
            MM: fill( d.getMonth()+1 ),
            M: d.getMonth()+1,
            dd: fill( d.getDate() ),
            d: d.getDate(),
            HH: fill( d.getHours() ),
            H: d.getHours(),
            mm: fill( d.getMinutes() ),
            m: d.getMinutes(),
            ss: fill( d.getSeconds() ),
            s: d.getSeconds()
        }

        var patts = format.match(/[a-zA-Z]+/g)
        for( var i=0; i<patts.length; i++ ){
            var prop = patts[i]
            format = format.replace( prop, obj[prop] )
        }

        return format
    }
}


// 创建元素
function create( tag, className ){
    var el = document.createElement( tag )
    el.className = className
    return el
}

//
function query( id ){
    return document.getElementById( id )
}


function listener( el, evtName, fn ){
    if( el.addEventListener ){
        el.addEventListener( evtName, fn, false )

    }else{
        el['on' + evtName] = fn
    }
}


// 获取位置
function getPos( el ){
    if( el.getBoundingClientRect ){
        return el.getBoundingClientRect()
    }

    var p = {
        left: 0,
        top: 0
    }

    while( el.tagName !== 'BODY' ){
        p.left += el.offsetLeft
        p.top += el.offsetTop

        el = el.offsetParent
    }

    return p
}


// 深度拷贝
function clone( target, srcObj ){
    if( isUndefined(srcObj) ){
        clone( {}, target )
        return;
    }


    for( var prop in srcObj ){
        var value = srcObj[prop]

        if( isObject(value) ){
            target[prop] = {}
            clone( target[prop], value )
        }
        else if( isArray(value) ){
            target[prop] = value.slice(0)
        }
        else{
            target[prop] = value
        }
    }

    return target
}


// 添加样式类
function addClass(el, className){
    if( el.classList ){
        el.classList.add( className )
        return
    }

    var cName = el.className
    if( !cName ){
        el.className = className
        return el
    }

    if( !hasClass(el, className) ){
        el.className += ' ' + className
    }
    return el
}

// 移除样式类
function removeClass(el, className){
    if( el.classList ){
        el.classList.remove( className )
        return
    }

    var cName = el.className
    if( !cName ){
        return el
    }
    
    if( el.className === className ){
        el.className = ''
        return el
    }

    if( hasClass(el, className) ){
        var names = el.className.split(' ')

        for( var i=0; i<names.length; i++ ){
            if( names[i] === className ){
                names.splice(i, 1)
            }
        }

        el.className = names.join(' ')
    }
    return el
}

// 检测是否有样式类
function hasClass(el, className){
    if( el.classList ){
        el.classList.contains( className )
        return
    }

    if( !el.className ){
        return false
    }

    if( el.className === className ){
        return true
    }

    var names = el.className.split(' ')
    for( var i=0; i<names.length; i++ ){
        if( names[i] === className ){
            return true
        }
    }
    
    return false
}

//
function toggleClass(el, className){
    if( hasClass(el, className) ){
        removeClass(el, className)

    }else{
        addClass(el, className)
    }
}



function random( len ){
    len = len || 8;
    return Math.random().toString().slice(2, 2 + len)
}



function fill( n ){
    return n < 10 ? '0'+n: n;
}


function type( param ){
    return Object.prototype.toString.call(param).slice(8, -1).toLowerCase()
}


function isObject( param ){
    return type(param) === 'object'
}


function isArray( param ){
    return type(param) === 'array'
}

function isUndefined( param ){
    return type(param) === 'undefined'
}



// ie9+ 根据属性自动初始化
if( document.querySelectorAll ){
    var eles = document.querySelectorAll('[simudatepickter]')

    for( var i=0; i<eles.length; i++ ){
        var el = eles[i]
        var format = el.getAttribute( 'data-format' ) || 'yyyy-MM-dd'

        el.datepickter = new SiMuDatePickter({
            targetEl: el,
            format: format
            ,initValue: el.value || el.innerHTML
        })
        // listener( el, 'click', el.datepickter.show.bind(el.datepickter) )
    }
}


if( !hasGlobal ){
    window.SiMuDatePickter = SiMuDatePickter
}

return SiMuDatePickter
})

