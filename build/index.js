KISSY.add('kg/xmenu/1.0.0/index',function(S, Util, Base,Event, XScroll,Node) {
    var $ = Node.all;
    function XMenu(cfg) {
        XMenu.superclass.constructor.call(this)
        this.userConfig = Util.mix({
            maskNode: ""
        }, cfg);
        this.init();
    }
    Util.extend(XMenu, Base, {
        init: function() {
            var self = this;
            self.renderTo = document.querySelector(self.userConfig.renderTo) || document.body;
            self.gradesNum = 0;
            self.width = self.userConfig.width || self.renderTo.offsetWidth || 100;
            self.zIndexBase = self.userConfig.zIndex || 1000;
            self.scrolls = [];
            self.currentId = 0;
            self.formatTree();
            self.render();
        },
        formatTree: function() {
            var self = this;
            var pageIndex = 0;
            self.totalData = [];
            self.id = 0;

            function _format(d, grade, pid) {
                grade++;
                for (var i in d) {
                    self.totalData.push(d[i]);
                    d[i].grade = grade;
                    d[i].id = self.id;
                    d[i].idx = i;
                    d[i].pid = undefined === pid ? "" : Number(pid);
                    self.id++;
                    if (d[i].children && d[i].children.length) {
                        _format(d[i].children, grade, i);
                    } else {
                        d[i].pageIndex = pageIndex++;
                    }

                }
                if (grade > self.gradesNum) {
                    self.gradesNum = grade;
                }
            }

            _format(self.userConfig.data, 0);
        },
        createScroll: function(index) {
            var self = this;
            var renderTo = document.createElement("div");
            renderTo.id = "XS_" + index;
            renderTo.className = "menu-container";
            renderTo.style.width = self.width;
            renderTo.style.height = "100%";
            renderTo.style.position = "absolute";
            renderTo.style.zIndex = self.zIndexBase + self.gradesNum - index;
            renderTo.style.webkitTransform = "translateZ(0)";
            renderTo.style.left = index - 1 < 0 ? 0 : (index - 1) * self.width + "px";
            var container = document.createElement("div");
            container.className = "xs-container";
            var content = document.createElement("div");
            content.className = "xs-content";
            renderTo.appendChild(container);
            container.appendChild(content);
            self.renderTo.appendChild(renderTo);
            var xscroll = new XScroll({
                renderTo: "#" + renderTo.id,
                SROLL_ACCELERATION: 0.001,
                lockX: true,
                scrollbarX: false,
                scrollbarY: false
            });
            xscroll.renderTo.style.display = "none";
            xscroll.render();
            self.scrolls[index] = xscroll;
            return xscroll;
        },
        _computPos: function() {
            var self = this;
            self.width = self.renderTo.offsetWidth;
            for (var i in self.xscrolls) {
                self.xscrolls[i].renderTo.style.left = i - 1 < 0 ? 0 : (i - 1) * self.width + "px";
            }
        },
        render: function() {
            var self = this;
            var data = self.userConfig.data;
            self.width = self.userConfig.width || self.renderTo.offsetWidth || 100;
            for (var i = 0; i < self.gradesNum; i++) {
                if (!self.scrolls[i]) {
                    self.createScroll(i);
                }
            }
            self._renderSingleMenu(1, data);
            self._renderMask();
            self._bindEvt();
        },
        _renderMask: function() {
            var self = this;
            if (self._isMaskRendered) return;
            self._isMaskRendered = true;
            var mask = self.userConfig.maskNode && document.querySelector(self.userConfig.maskNode);
            if (!mask) {
                mask = document.createElement("div");
                document.body.appendChild(mask);
            }
            mask.className = "ks-sider-menu-mask";
            mask.style.zIndex = self.zIndexBase;
            mask.style.opacity = 0;
            mask.style.webkitTransition = "all 0.5s ease";
            mask.addEventListener("touchstart", function(e) {
                e.preventDefault();
                self.hide();
            }, false)

            self.mask = mask;
        },
        showMask: function() {
            var self = this;
            self.mask.style.display = "block";
            self.mask.style.opacity = "0.5";
        },
        hideMask: function() {
            var self = this;
            // self.mask.style.display = "none";
            self.mask.style.opacity = "0";
        },
        _renderSingleMenu: function(grade, data, pid) {
            var self = this;
            var template = self.userConfig.template;
            var html = '<ul>';
            for (var i in data) {
                var isLeaf = self._getData(grade, i).children && self._getData(grade, i).children.length ? false : true;
                html += '<li class="menu-item" data-index="' + i + '" data-id="' + data[i].id + '" data-grade="' + data[i].grade + '" data-pid="' + (pid || "") + '">' + self.userConfig.renderHook.call(self, data[i]) + (isLeaf ? '' : '<i></i>') + '</li>'
            }
            html += '</ul>';
            if (!self.scrolls[grade - 1]) return;
            self.scrolls[grade - 1].renderTo.style.display = "block";
            self.scrolls[grade - 1].content.innerHTML = html;
            self.scrolls[grade - 1].render();
        },
        pop: function(grade) {
            var self = this;
            if (!self.scrolls[grade]) return;
            var el = self.scrolls[grade].renderTo;
            el.style.display = "block";
            el.style.webkitTransform = "translate(" + self.width + "px,0) translateZ(0)";
            el.style.webkitTransition = "-webkit-transform 0.5s ease";
            self.showMask();
        },
        hide: function(grade) {
            var self = this;
            var grade = grade || 1;
            if (!self.scrolls[grade]) return;
            for (var i in self.scrolls) {
                if (i >= grade) {
                    var el = self.scrolls[i].renderTo;
                    el.style.display = "none";
                    el.style.webkitTransform = "translate(0,0) translateZ(0)";
                }
            }
            if (grade == 1) {
                self.hideMask()
            }
        },
        switchTo: function(grade, index, pid) {
            var self = this;
            var childrenGrade = grade + 1;
            var data = self._getMenuData(grade + 1, index);
            var xscroll = self.scrolls[grade - 1];
            var offset = xscroll.getOffsetTop();
            var renderTo = xscroll.renderTo;
            var tgt;
            // 先判断父节点是否为当前选中节点
            if (pid) {
                var parentGrade = grade - 1;
                var pXscroll = self.scrolls[parentGrade - 1];
                var parentRenderTo = xscroll.renderTo;
                var parentCurEl = parentRenderTo.querySelector('.cur');
                if (!parentCurEl || pid != parentCurEl.attr('data-index')) {
                    $(parentRenderTo).all('li').removeClass('cur');
                    $(parentRenderTo).all('[data-index="' + pid + '"]').addClass('cur');
                    self._renderSingleMenu(grade, self._getMenuData(grade, pid), 1);
                }
            }

            var menuItems = renderTo.querySelectorAll(".menu-item");
            for(var i =0;i<menuItems.length;i++){
                if (grade ==menuItems[i].getAttribute("data-grade") && index == menuItems[i].getAttribute("data-index")) {
                    tgt=menuItems[i]
                }
            }

            if (!tgt) return;


            var posIndex = $(renderTo).all(".menu-item").index($(tgt));
            var height = renderTo.querySelector(".menu-item").offsetHeight;
            var scrollY = renderTo.offsetHeight / 2 - height * posIndex;
            if (scrollY > 0) {
                scrollY = 0;
            }
            if (scrollY < xscroll.boundry.bottom - xscroll.containerHeight) {
                scrollY = xscroll.boundry.bottom - xscroll.containerHeight;
            }
            var evt = {
                menu: tgt,
                data: self._getData(grade, posIndex, pid)
            };
            if (data && data.length) {
                //标志是叶子节点
                evt.isLeaf = false;
                !$(tgt).hasClass('cur') && self._renderSingleMenu(childrenGrade, data, posIndex);
                self.pop(grade);
            } else {
                //标志是叶子节点
                evt.isLeaf = true;
                self.hide();
            }
            $(tgt).addClass("cur").siblings().removeClass("cur");
            xscroll.scrollY(-scrollY, 300);
            self.fire("switch", evt);
        },
        switchToNext: function() {
            var self = this;
            if (self.currentId < self.totalData.length - 1) {
                self.currentId++;
                self.switchTo(self.totalData[self.currentId].grade, self.totalData[self.currentId].idx);
            }
        },
        switchToPrev: function() {
            var self = this;
            if (self.currentId > 0) {
                self.currentId--;
                self.switchTo(self.totalData[self.currentId].grade, self.totalData[self.currentId].idx);
            }
        },
        _bindEvt: function() {
            var self = this;
            if (self._isEvtBind) return;
            self._isEvtBind = true;
            Event.on(self.renderTo,"xsTap", function(e) {
                var $tgt = $(e.target);
                if ($tgt.hasClass("menu-item")) {
                    var grade = Number($tgt.attr("data-grade"));
                    var index = Number($tgt.attr("data-index"));
                    var pid = Number($tgt.attr("data-pid"));
                    self.switchTo(grade, index, pid);
                    var isLeaf = self._getData(grade, index).children && self._getData(grade, index).children.length ? false : true;
                    self.fire("click", {
                        grade: grade,
                        index: index,
                        isLeaf: isLeaf,
                        pid: pid
                    });
                }
            });
            for (var i in self.scrolls) {
                self.scrolls[i].on("refresh", function() {
                    self.hide();
                    self._computPos();
                })
            }

            document.addEventListener("webkitTransitionEnd", function(e) {
                if (e.target == self.mask && self.mask.style.opacity == 0) {
                    self.mask.style.display = "none";
                }
            }, false)
        },
        _getMenuData: function(grade, index) {
            var self = this;
            var data = self.totalData;
            var rdata = [];
            for (var i in data) {
                if (data[i].grade == grade && data[i].pid == index) {
                    rdata.push(data[i])
                }
            }
            return rdata;
        },
        _getData: function(grade, index, pid) {
            var self = this;
            var data = self.totalData;
            for (var i in data) {
                if (data[i].grade == grade && data[i].idx == index && (!pid || pid == data[i].pid)) {
                    return data[i]
                }
            }
        }
    });
    return XMenu;

}, {
    requires: ['kg/xscroll/2.3.1/util', 'kg/xscroll/2.3.1/base', 'kg/xscroll/2.3.1/event','kg/xscroll/2.3.1/core','node']
});