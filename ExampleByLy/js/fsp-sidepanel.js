var fsp = function (toggleSelector, contentAreaSelector, sidebarSelector) {
    var _fsp = function (toggleSelector, contentAreaSelector, sidebarSelector) {
        this.toggler = document.querySelector(toggleSelector);
        this.contentArea = document.querySelector(contentAreaSelector);
        this.sidebar = document.querySelector(sidebarSelector);
        this.contentAreaSelector = contentAreaSelector;
        this.openStateClassName = 'fsp-isOpen-' + Math.random().toString(36).substring(5);
        this.stylesheet = document.styleSheets[0];
        this.opts = {
            side: 'left'
        };
    };

    _fsp.prototype.sidepanel = function (options) {
        var me = this;

        this.opts['side'] = options['side'] || this.opts['side'];
        this.opts['size'] = options['size'] || parseInt(this.sidebar.clientWidth, 10) + 'px';

        switch (this.opts.side) {
            case 'left':
                this.stylesheet.insertRule(this.contentAreaSelector + "." + this.openStateClassName + "{ transform: translate3d(" + this.opts.size + ", 0, 0);}", 0);
                break;
            case 'right':
                this.stylesheet.insertRule(this.contentAreaSelector + "." + this.openStateClassName + "{ transform: translate3d(-" + this.opts.size + ", 0, 0);}", 0);
                break;
        }

        this.toggler.addEventListener("click", function (e) {
            me.toggle(e);
        });

        return me;
    };

    _fsp.prototype.toggle = function (e) {
        this.contentArea.classList.toggle(this.openStateClassName);
        if (e) {
            e.preventDefault();
        }

        return this.me;
    };

    return new _fsp(toggleSelector, contentAreaSelector, sidebarSelector);
};