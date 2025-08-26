<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    
    <!-- Parameters for matching criteria -->
    <xsl:param name="styleId"/>
    <xsl:param name="styleName"/>
    <xsl:param name="elementType"/>
    <xsl:param name="matchMode" select="'exact'"/>
    <xsl:param name="caseSensitive" select="'true'"/>
    <xsl:param name="requireChildren" select="'false'"/>
    <xsl:param name="minChildren" select="0"/>
    <xsl:param name="maxChildren" select="999"/>
    
    <!-- Root template -->
    <xsl:template match="/">
        <xsl:call-template name="evaluate-match">
            <xsl:with-param name="element" select="/element"/>
        </xsl:call-template>
    </xsl:template>
    
    <!-- Main matching logic template -->
    <xsl:template name="evaluate-match">
        <xsl:param name="element"/>
        
        <xsl:variable name="elementTypeMatch">
            <xsl:call-template name="check-element-type">
                <xsl:with-param name="element" select="$element"/>
            </xsl:call-template>
        </xsl:variable>
        
        <xsl:variable name="styleIdMatch">
            <xsl:call-template name="check-style-id">
                <xsl:with-param name="element" select="$element"/>
            </xsl:call-template>
        </xsl:variable>
        
        <xsl:variable name="styleNameMatch">
            <xsl:call-template name="check-style-name">
                <xsl:with-param name="element" select="$element"/>
            </xsl:call-template>
        </xsl:variable>
        
        <xsl:variable name="childrenMatch">
            <xsl:call-template name="check-children">
                <xsl:with-param name="element" select="$element"/>
            </xsl:call-template>
        </xsl:variable>
        
        <!-- Combine all match results -->
        <result>
            <xsl:choose>
                <xsl:when test="$elementTypeMatch = 'true' and 
                              $styleIdMatch = 'true' and 
                              $styleNameMatch = 'true' and 
                              $childrenMatch = 'true'">
                    <xsl:text>true</xsl:text>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:text>false</xsl:text>
                </xsl:otherwise>
            </xsl:choose>
        </result>
    </xsl:template>
    
    <!-- Check element type -->
    <xsl:template name="check-element-type">
        <xsl:param name="element"/>
        
        <xsl:choose>
            <xsl:when test="not($elementType) or $elementType = ''">
                <xsl:text>true</xsl:text>
            </xsl:when>
            <xsl:when test="$element/@type = $elementType">
                <xsl:text>true</xsl:text>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>false</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Check style ID -->
    <xsl:template name="check-style-id">
        <xsl:param name="element"/>
        
        <xsl:choose>
            <xsl:when test="not($styleId) or $styleId = ''">
                <xsl:text>true</xsl:text>
            </xsl:when>
            <xsl:when test="$element/@styleId = $styleId">
                <xsl:text>true</xsl:text>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>false</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Check style name with various matching modes -->
    <xsl:template name="check-style-name">
        <xsl:param name="element"/>
        
        <xsl:choose>
            <xsl:when test="not($styleName) or $styleName = ''">
                <xsl:text>true</xsl:text>
            </xsl:when>
            <xsl:when test="$matchMode = 'exact'">
                <xsl:call-template name="exact-match">
                    <xsl:with-param name="actual" select="$element/@styleName"/>
                    <xsl:with-param name="expected" select="$styleName"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="$matchMode = 'contains'">
                <xsl:call-template name="contains-match">
                    <xsl:with-param name="actual" select="$element/@styleName"/>
                    <xsl:with-param name="expected" select="$styleName"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="$matchMode = 'startsWith'">
                <xsl:call-template name="starts-with-match">
                    <xsl:with-param name="actual" select="$element/@styleName"/>
                    <xsl:with-param name="expected" select="$styleName"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="$matchMode = 'endsWith'">
                <xsl:call-template name="ends-with-match">
                    <xsl:with-param name="actual" select="$element/@styleName"/>
                    <xsl:with-param name="expected" select="$styleName"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="$matchMode = 'regex'">
                <!-- Note: XSLT 1.0 doesn't have native regex support -->
                <!-- This would need XSLT 2.0+ or custom extension functions -->
                <xsl:text>false</xsl:text>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>false</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Check children constraints -->
    <xsl:template name="check-children">
        <xsl:param name="element"/>
        
        <xsl:variable name="childCount" select="count($element/children/*)"/>
        
        <xsl:choose>
            <xsl:when test="$requireChildren = 'true' and $childCount = 0">
                <xsl:text>false</xsl:text>
            </xsl:when>
            <xsl:when test="$childCount &lt; $minChildren">
                <xsl:text>false</xsl:text>
            </xsl:when>
            <xsl:when test="$childCount > $maxChildren">
                <xsl:text>false</xsl:text>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>true</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Exact match helper -->
    <xsl:template name="exact-match">
        <xsl:param name="actual"/>
        <xsl:param name="expected"/>
        
        <xsl:choose>
            <xsl:when test="$caseSensitive = 'true'">
                <xsl:choose>
                    <xsl:when test="$actual = $expected">
                        <xsl:text>true</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>false</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:choose>
                    <xsl:when test="translate($actual, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 
                                  translate($expected, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')">
                        <xsl:text>true</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>false</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Contains match helper -->
    <xsl:template name="contains-match">
        <xsl:param name="actual"/>
        <xsl:param name="expected"/>
        
        <xsl:choose>
            <xsl:when test="$caseSensitive = 'true'">
                <xsl:choose>
                    <xsl:when test="contains($actual, $expected)">
                        <xsl:text>true</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>false</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:choose>
                    <xsl:when test="contains(translate($actual, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 
                                          translate($expected, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))">
                        <xsl:text>true</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>false</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Starts with match helper -->
    <xsl:template name="starts-with-match">
        <xsl:param name="actual"/>
        <xsl:param name="expected"/>
        
        <xsl:choose>
            <xsl:when test="$caseSensitive = 'true'">
                <xsl:choose>
                    <xsl:when test="starts-with($actual, $expected)">
                        <xsl:text>true</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>false</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:choose>
                    <xsl:when test="starts-with(translate($actual, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 
                                             translate($expected, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))">
                        <xsl:text>true</xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>false</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Ends with match helper (XSLT 1.0 doesn't have ends-with, so we simulate it) -->
    <xsl:template name="ends-with-match">
        <xsl:param name="actual"/>
        <xsl:param name="expected"/>
        
        <xsl:variable name="actualToCheck">
            <xsl:choose>
                <xsl:when test="$caseSensitive = 'false'">
                    <xsl:value-of select="translate($actual, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$actual"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        
        <xsl:variable name="expectedToCheck">
            <xsl:choose>
                <xsl:when test="$caseSensitive = 'false'">
                    <xsl:value-of select="translate($expected, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$expected"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        
        <xsl:variable name="actualLength" select="string-length($actualToCheck)"/>
        <xsl:variable name="expectedLength" select="string-length($expectedToCheck)"/>
        
        <xsl:choose>
            <xsl:when test="$expectedLength > $actualLength">
                <xsl:text>false</xsl:text>
            </xsl:when>
            <xsl:when test="substring($actualToCheck, $actualLength - $expectedLength + 1) = $expectedToCheck">
                <xsl:text>true</xsl:text>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>false</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
</xsl:stylesheet>